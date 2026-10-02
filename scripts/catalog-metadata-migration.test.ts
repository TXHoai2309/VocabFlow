import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { describe, expect, it } from "vitest";

type MetadataUpdate = {
  table: "learning_sets" | "topics" | "achievements";
  keyColumn: "slug" | "code";
  key: string;
  columns: string[];
  values: string[];
};

const expectedUpdates: Array<Omit<MetadataUpdate, "columns"> & { columns: string[] }> = [
  { table: "learning_sets", keyColumn: "slug", key: "starter-vocabulary", columns: ["name", "description"], values: ["Bộ từ khởi đầu VocabFlow", "Bộ từ khởi đầu giúp người học làm quen với những từ vựng cơ bản."] },
  { table: "learning_sets", keyColumn: "slug", key: "grade-1-starter", columns: ["name", "description"], values: ["Bộ từ khởi đầu lớp 1", "Bộ từ cơ bản được chọn phù hợp cho học sinh lớp 1."] },
  { table: "learning_sets", keyColumn: "slug", key: "family-basics", columns: ["name", "description"], values: ["Từ vựng gia đình", "Các từ quen thuộc về người thân và cuộc sống trong gia đình."] },
  { table: "learning_sets", keyColumn: "slug", key: "school-basics", columns: ["name", "description"], values: ["Từ vựng trường học", "Các từ quen thuộc về trường lớp và hoạt động học tập."] },
  { table: "learning_sets", keyColumn: "slug", key: "everyday-words", columns: ["name", "description"], values: ["Từ vựng hằng ngày", "Các từ thông dụng để luyện tập trong những tình huống hằng ngày."] },
  { table: "learning_sets", keyColumn: "slug", key: "grade-1-home", columns: ["name", "description"], values: ["Nhà cửa lớp 1", "Từ vựng về các phòng và đồ vật quen thuộc trong nhà."] },
  { table: "learning_sets", keyColumn: "slug", key: "grade-1-family", columns: ["name", "description"], values: ["Gia đình lớp 1", "Các từ cơ bản về quan hệ gia đình, phù hợp cho những cuộc trò chuyện đầu tiên."] },
  { table: "learning_sets", keyColumn: "slug", key: "grade-1-school", columns: ["name", "description"], values: ["Trường học lớp 1", "Từ vựng thiết thực về đồ dùng học tập và các hoạt động trong lớp."] },
  { table: "learning_sets", keyColumn: "slug", key: "grade-1-food", columns: ["name", "description"], values: ["Đồ ăn lớp 1", "Các món ăn và nguyên liệu quen thuộc trong đời sống hằng ngày."] },
  { table: "learning_sets", keyColumn: "slug", key: "grade-1-actions", columns: ["name", "description"], values: ["Hành động lớp 1", "Các hành động thường gặp trong chỉ dẫn và câu chuyện đơn giản."] },
  { table: "learning_sets", keyColumn: "slug", key: "grade-2-body", columns: ["name", "description"], values: ["Cơ thể lớp 2", "Từ vựng về cơ thể thường dùng khi nói về sức khỏe và ở lớp."] },
  { table: "learning_sets", keyColumn: "slug", key: "grade-2-outdoors", columns: ["name", "description"], values: ["Thiên nhiên và phương hướng lớp 2", "Từ vựng về thiên nhiên, địa điểm và phương hướng khi khám phá xung quanh."] },
  { table: "learning_sets", keyColumn: "slug", key: "grade-2-clothing", columns: ["name", "description"], values: ["Quần áo lớp 2", "Từ vựng về quần áo và phụ kiện thường gặp."] },
  { table: "learning_sets", keyColumn: "slug", key: "grade-2-feelings", columns: ["name", "description"], values: ["Cảm xúc lớp 2", "Các từ diễn tả cảm xúc trong giao tiếp và kể chuyện."] },
  { table: "learning_sets", keyColumn: "slug", key: "grade-3-language", columns: ["name", "description"], values: ["Ngôn ngữ lớp 3", "Từ vựng về giao tiếp và chữ viết, hỗ trợ việc đọc hiểu độc lập."] },
  { table: "learning_sets", keyColumn: "slug", key: "grade-3-tools", columns: ["name", "description"], values: ["Công nghệ, khoa học và hình ảnh lớp 3", "Từ vựng về công nghệ, khoa học và hình ảnh quen thuộc trong đời sống."] },
  { table: "topics", keyColumn: "slug", key: "action", columns: ["name", "description"], values: ["Hành động", "Từ vựng về các hành động thường gặp."] },
  { table: "topics", keyColumn: "slug", key: "body", columns: ["name", "description"], values: ["Cơ thể", "Từ vựng về các bộ phận trên cơ thể."] },
  { table: "topics", keyColumn: "slug", key: "casual", columns: ["name", "description"], values: ["Giao tiếp thường ngày", "Từ vựng thường dùng trong giao tiếp hằng ngày."] },
  { table: "topics", keyColumn: "slug", key: "challenge", columns: ["name", "description"], values: ["Thử thách", "Các từ vựng nâng cao để người học thử sức."] },
  { table: "topics", keyColumn: "slug", key: "clothing", columns: ["name", "description"], values: ["Quần áo", "Từ vựng về quần áo và trang phục."] },
  { table: "topics", keyColumn: "slug", key: "common-place", columns: ["name", "description"], values: ["Địa điểm quen thuộc", "Từ vựng về những địa điểm thường gặp."] },
  { table: "topics", keyColumn: "slug", key: "communication", columns: ["name", "description"], values: ["Giao tiếp", "Từ vựng dùng trong giao tiếp và trao đổi thông tin."] },
  { table: "topics", keyColumn: "slug", key: "computer-office-science", columns: ["name", "description"], values: ["Máy tính, văn phòng và khoa học", "Từ vựng về máy tính, văn phòng và khoa học."] },
  { table: "topics", keyColumn: "slug", key: "emotion", columns: ["name", "description"], values: ["Cảm xúc", "Từ vựng diễn tả cảm xúc và trạng thái."] },
  { table: "topics", keyColumn: "slug", key: "family", columns: ["name", "description"], values: ["Gia đình", "Từ vựng về gia đình và người thân."] },
  { table: "topics", keyColumn: "slug", key: "food", columns: ["name", "description"], values: ["Đồ ăn", "Từ vựng về đồ ăn và thức uống."] },
  { table: "topics", keyColumn: "slug", key: "healthy", columns: ["name", "description"], values: ["Sức khỏe", "Từ vựng về sức khỏe và thói quen lành mạnh."] },
  { table: "topics", keyColumn: "slug", key: "miscellaneous", columns: ["name", "description"], values: ["Khác", "Các từ vựng thuộc nhiều nhóm chủ đề khác nhau."] },
  { table: "topics", keyColumn: "slug", key: "nature", columns: ["name", "description"], values: ["Thiên nhiên", "Từ vựng về thiên nhiên và môi trường xung quanh."] },
  { table: "topics", keyColumn: "slug", key: "object-in-house", columns: ["name", "description"], values: ["Đồ vật trong nhà", "Từ vựng về các đồ vật thường gặp trong nhà."] },
  { table: "topics", keyColumn: "slug", key: "photography", columns: ["name", "description"], values: ["Nhiếp ảnh", "Từ vựng liên quan đến hình ảnh và nhiếp ảnh."] },
  { table: "topics", keyColumn: "slug", key: "writing-numbers", columns: ["name", "description"], values: ["Viết và số", "Từ vựng liên quan đến chữ viết, số và cách biểu đạt."] },
  { table: "achievements", keyColumn: "code", key: "FIRST_REVIEW", columns: ["description"], values: ["Hoàn thành lần ôn tập đầu tiên."] },
  { table: "achievements", keyColumn: "code", key: "TEN_WORDS_LEARNED", columns: ["description"], values: ["Đã bắt đầu học ít nhất 10 từ."] },
  { table: "achievements", keyColumn: "code", key: "FIFTY_WORDS_LEARNED", columns: ["description"], values: ["Đã bắt đầu học ít nhất 50 từ."] },
  { table: "achievements", keyColumn: "code", key: "SEVEN_DAY_STREAK", columns: ["description"], values: ["Duy trì chuỗi học liên tiếp ít nhất 7 ngày."] }
];

describe("Vietnamese catalog metadata migration", () => {
  it("remains ordered immediately before the additive Master V2 bridge migration", () => {
    const journal = JSON.parse(readFileSync(resolve("drizzle/migrations/meta/_journal.json"), "utf8")) as {
      entries: Array<{ idx: number; when: number; tag: string }>;
    };
    const entry = journal.entries.find((candidate) => candidate.tag === "0014_vietnamese_catalog_metadata");
    const bridgeEntry = journal.entries.at(-1);
    const migrations = readMigrationFiles({ migrationsFolder: "drizzle/migrations" });
    const migration = migrations.find((candidate) => candidate.folderMillis === entry?.when);

    expect(entry).toMatchObject({ idx: 14, tag: "0014_vietnamese_catalog_metadata" });
    expect(bridgeEntry).toMatchObject({ idx: 15, tag: "0015_clean_yellowjacket" });
    expect(entry?.when).toBeGreaterThan(journal.entries.at(-3)?.when ?? 0);
    expect(migration?.sql).toHaveLength(expectedUpdates.length);
  });

  it("updates only approved display metadata by stable slug/code", () => {
    const migration = readFileSync(resolve("drizzle/migrations/0014_vietnamese_catalog_metadata.sql"), "utf8");
    const statements = migration.split("--> statement-breakpoint").map((statement) => statement.trim()).filter(Boolean);
    const actualUpdates: MetadataUpdate[] = statements.map((statement) => {
      const match = statement.match(/^UPDATE\s+"vocabflow_app"\."(learning_sets|topics|achievements)"\s+SET\s+([\s\S]+?)\s+WHERE\s+"(slug|code)"\s*=\s*'([^']+)';?$/i);
      expect(match, `Unexpected migration statement: ${statement}`).not.toBeNull();
      const [, table, setClause, keyColumn, key] = match!;
      const assignments = [...setClause!.matchAll(/"([a-z_]+)"\s*=\s*'((?:''|[^'])*)'/g)];
      const columns = assignments.map((assignment) => assignment[1]!);
      const values = assignments.map((assignment) => assignment[2]!.replaceAll("''", "'"));
      expect(columns).toEqual(table === "achievements" ? ["description"] : ["name", "description"]);
      expect(keyColumn).toBe(table === "achievements" ? "code" : "slug");
      return { table: table as MetadataUpdate["table"], keyColumn: keyColumn as MetadataUpdate["keyColumn"], key: key!, columns, values };
    });

    expect(actualUpdates).toEqual(expectedUpdates);
    expect(migration).not.toMatch(/\b(INSERT|DELETE|TRUNCATE|DROP|ALTER)\b/i);
    expect(migration).not.toMatch(/\bSET\s+"(?:id|slug|source_topic|sort_order|enabled|grade|created_at|updated_at)"\s*=/i);
  });
});
