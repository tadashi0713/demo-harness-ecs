# 会議室予約デモ (Next.js + PostgreSQL)

Next.js (App Router) の画面と API (Route Handlers) を 1 つのアプリにまとめ、PostgreSQL (Prisma) に保存する会議室予約アプリです。

- 会議室一覧 (本日の予約件数)
- 日別タイムライン、予約作成、取消
- 予約ルール: 9:00〜18:00 の同日内 / 15 分単位 / 同じ会議室で時間帯が重複しない (隣接は可)

## 構成

```
src/
  app/
    page.tsx                              # 会議室一覧
    rooms/[id]/page.tsx                   # 日別タイムライン + 予約フォーム
    api/health/route.ts                   # GET    ヘルスチェック (DB 疎通)
    api/rooms/route.ts                    # GET    会議室一覧
    api/rooms/[id]/reservations/route.ts  # GET ?date=YYYY-MM-DD / POST 予約作成
    api/reservations/[id]/route.ts        # DELETE 予約取消
  lib/reservation.ts                      # 予約検証ロジック (ユニットテスト対象)
db/
  changelog.yaml                          # Liquibase changelog (マイグレーション + seed)
  changes/*.sql
prisma/schema.prisma                      # Prisma Client 生成用のスキーマ
e2e/                                      # Playwright
```

docker compose は `db` (PostgreSQL) → `migrate` (Liquibase で changelog を適用して終了) → `app` の順に起動します。

スキーマ変更は `db/changes/` に SQL を追加して `db/changelog.yaml` に changeSet を足し、同じ変更を `prisma/schema.prisma` にも反映します。Prisma はクライアント生成にのみ使い、マイグレーションは Liquibase (ローカルは docker compose、stg / prod は Harness DB DevOps) で実行します。

## 起動

```bash
docker compose up --build
```

http://localhost:3000 を開きます。ポートが使用中の場合は `APP_PORT` / `DB_PORT` で変更できます。

```bash
APP_PORT=3300 DB_PORT=55432 docker compose up --build
```

TLS インスペクションを行うプロキシ (Zscaler 等) の配下で Prisma エンジンのダウンロードに失敗する場合は、ルート CA の PEM を `EXTRA_CA_CERT` で渡してください (BuildKit secret としてビルド時のみ使用されます)。

```bash
EXTRA_CA_CERT=./.certs/extra-ca.pem docker compose up --build
```

## ローカル開発

```bash
cp .env.example .env
docker compose up -d db
npm install
npm run db:migrate       # docker compose run --rm migrate (Liquibase)
npm run dev
```

## テスト

```bash
npm test                 # Vitest (src/lib/reservation.test.ts)

npx playwright install chromium
docker compose up -d --build --wait
npm run test:e2e         # BASE_URL (既定: http://localhost:3000) に対して実行
```

## AWS ECS へのデプロイ

```
terraform/
  shared/            # 共有 VPC / ECR (tadashi-demo-ecs) / Harness DB DevOps runner。最初に apply
  envs/stg/          # ステージング
  envs/prod/         # 本番
  modules/ecs-app/   # 環境ごとの ALB / RDS PostgreSQL / ECS クラスタ / IAM / Secrets Manager / CloudWatch Logs
deploy/ecs/          # Harness CD 用の ECS タスク定義・サービス定義
```

- Terraform はインフラまでを作成し、ECS サービスとタスク定義は Harness CD が `deploy/ecs/` を使ってデプロイします
- 手元で `terraform/shared` → `terraform/envs/stg` / `terraform/envs/prod` の順に `terraform init && terraform apply` します。`backend` は定義していないので state は各ディレクトリのローカルファイルです。`envs/*` は共有 VPC と runner のセキュリティグループを名前・タグで参照するので、`shared` を先に apply します
- コストを抑えるため stg と prod は 1 つの VPC を共有し、DB DevOps の runner も 1 つです。ALB・RDS・ECS クラスタ・セキュリティグループは環境ごとに分かれています
- タスクは NAT Gateway を使わずパブリックサブネットに配置し (パブリック IP あり)、セキュリティグループで ALB からの通信のみ許可します。RDS はインターネット経路のないサブネットに配置し、同じ環境のタスクと DB DevOps runner からのみ接続できます
- `DATABASE_URL` は Terraform が Secrets Manager に作成し、ECS がコンテナに注入します
- イメージは ARM64 (Fargate Graviton) を前提としています
- デモ用のため stg と prod は同じ低コスト構成です: RDS db.t4g.micro (Single-AZ、バックアップ 1 日、削除保護なし)、Fargate Spot でタスク 1 つ、Container Insights 無効、ログ保持 7 日
- デプロイ戦略は Harness 側で選びます。stg はローリングアップデート、prod はカナリアリリースを想定しています。Harness の ECS カナリアは同じターゲットグループにカナリア用サービスを一時的に追加するため、インフラは両環境で共通です

### スキーマのマイグレーション (Harness DB DevOps)

マイグレーションは Harness DB DevOps が ECS Fargate 上の runner から実行します。DB DevOps の DB Schema には、このリポジトリの `db/changelog.yaml` を指定します。

1. Harness Support に機能フラグ `CDS_ENABLE_ECS_CONTAINER_STEP_GROUP_INFRA` / `CDS_INIT_CONTAINER_V2_ASYNC_STEP` の有効化と runner イメージの提供を依頼します
2. `terraform/shared` を apply し、出力 `delegate_token_secret_arn` の Secrets Manager シークレットに Harness の delegate トークンを設定します
3. 変数 `dbops_runner_image` に runner イメージを指定して `terraform/shared` を再度 apply すると runner が起動します (空のままだと runner は作成されません)
4. Harness で「Assume IAM Role on Delegate」の AWS コネクタと、各環境の JDBC コネクタ (`terraform output jdbc_url` / `db_username` / `db_password`) を作成し、どちらも delegate selector に runner 名 (`room-booking-dbops-runner`) を指定します

### Harness CD の設定

apply 後、`terraform output harness_env_variables` の値を Harness の各 Environment (stg / prod) の変数として登録し、Infrastructure Definition にはクラスタ名 (`ecs_cluster_name`) とリージョンを設定します。Harness の Service ではプライマリアーティファクトに `tadashi-demo-ecs` を指定します。

## API 例

```bash
curl localhost:3000/api/rooms
curl "localhost:3000/api/rooms/1/reservations?date=2026-11-17"
curl -X POST localhost:3000/api/rooms/1/reservations \
  -H 'content-type: application/json' \
  -d '{"title":"定例","reservedBy":"山田","date":"2026-11-17","start":"10:00","end":"11:00"}'
curl -X DELETE localhost:3000/api/reservations/1
```

POST は入力不正・営業時間外などで `400`、時間帯の重複で `409` を返します。
