import { expect, test, type APIRequestContext } from "@playwright/test";

/** A random future date so tests don't collide with seed data or each other across runs. */
function uniqueDate() {
  const d = new Date();
  d.setDate(d.getDate() + 30 + Math.floor(Math.random() * 3000));
  return d.toISOString().slice(0, 10);
}

function uniqueTitle(prefix: string) {
  return `${prefix} ${Math.random().toString(36).slice(2, 8)}`;
}

async function createReservation(request: APIRequestContext, date: string, title: string) {
  const res = await request.post("/api/rooms/1/reservations", {
    data: { title, reservedBy: "E2E", date, start: "10:00", end: "11:00" },
  });
  expect(res.status()).toBe(201);
}

test("会議室一覧に seed の会議室が表示される", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "会議室一覧" })).toBeVisible();
  for (const name of ["会議室 A", "会議室 B", "大会議室"]) {
    await expect(page.getByRole("link", { name: new RegExp(name) })).toBeVisible();
  }
});

test("予約を作成するとタイムラインに表示される", async ({ page }) => {
  const date = uniqueDate();
  const title = uniqueTitle("定例");

  await page.goto(`/rooms/1?date=${date}`);
  await expect(page.getByTestId("current-date")).toHaveText(date);

  const form = page.getByRole("form", { name: "予約フォーム" });
  await form.getByLabel("件名").fill(title);
  await form.getByLabel("予約者").fill("山田");
  await form.getByLabel("開始").fill("13:00");
  await form.getByLabel("終了").fill("14:30");
  await form.getByRole("button", { name: "予約する" }).click();

  const timeline = page.getByLabel("タイムライン");
  await expect(timeline.getByText(title)).toBeVisible();
  await expect(timeline.getByText("13:00-14:30")).toBeVisible();
});

test("重複する時間帯の予約はエラーになる", async ({ page, request }) => {
  const date = uniqueDate();
  await createReservation(request, date, uniqueTitle("既存"));

  await page.goto(`/rooms/1?date=${date}`);
  const form = page.getByRole("form", { name: "予約フォーム" });
  await form.getByLabel("件名").fill(uniqueTitle("重複"));
  await form.getByLabel("予約者").fill("佐藤");
  await form.getByLabel("開始").fill("10:30");
  await form.getByLabel("終了").fill("11:30");
  await form.getByRole("button", { name: "予約する" }).click();

  await expect(form.getByRole("alert")).toHaveText("指定した時間帯は既に予約されています");
});

test("予約を取り消せる", async ({ page, request }) => {
  const date = uniqueDate();
  const title = uniqueTitle("取消対象");
  await createReservation(request, date, title);

  await page.goto(`/rooms/1?date=${date}`);
  const timeline = page.getByLabel("タイムライン");
  await expect(timeline.getByText(title)).toBeVisible();

  await page.getByRole("button", { name: `${title} を取り消す` }).click();
  await expect(timeline.getByText(title)).toHaveCount(0);
});
