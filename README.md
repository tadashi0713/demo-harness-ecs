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
prisma/                                   # schema / migrations / seed
e2e/                                      # Playwright
```

docker compose は `db` (PostgreSQL) → `migrate` (マイグレーション + seed を実行して終了) → `app` の順に起動します。

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
npm run db:migrate && npm run db:seed
npm run dev
```

## テスト

```bash
npm test                 # Vitest (src/lib/reservation.test.ts)

npx playwright install chromium
docker compose up -d --build --wait
npm run test:e2e         # BASE_URL (既定: http://localhost:3000) に対して実行
```

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
