ALTER TABLE "vocabflow_app"."topics" ADD COLUMN "review_status" text DEFAULT 'UNREVIEWED' NOT NULL;--> statement-breakpoint
ALTER TABLE "vocabflow_app"."topics" ADD COLUMN "parent_topic_id" integer;--> statement-breakpoint
ALTER TABLE "vocabflow_app"."vocabulary_topics" ADD COLUMN "review_status" text DEFAULT 'UNREVIEWED' NOT NULL;--> statement-breakpoint
ALTER TABLE "vocabflow_app"."topics" ADD CONSTRAINT "topics_parent_topic_fk" FOREIGN KEY ("parent_topic_id") REFERENCES "vocabflow_app"."topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "topics_parent_topic_idx" ON "vocabflow_app"."topics" USING btree ("parent_topic_id");--> statement-breakpoint
ALTER TABLE "vocabflow_app"."topics" ADD CONSTRAINT "topics_review_status_check" CHECK ("vocabflow_app"."topics"."review_status" IN ('APPROVED', 'UNREVIEWED'));--> statement-breakpoint
ALTER TABLE "vocabflow_app"."topics" ADD CONSTRAINT "topics_not_self_parent_check" CHECK ("vocabflow_app"."topics"."parent_topic_id" IS NULL OR "vocabflow_app"."topics"."parent_topic_id" <> "vocabflow_app"."topics"."id");--> statement-breakpoint
ALTER TABLE "vocabflow_app"."vocabulary_topics" ADD CONSTRAINT "vocabulary_topics_review_status_check" CHECK ("vocabflow_app"."vocabulary_topics"."review_status" IN ('APPROVED', 'UNREVIEWED'));
--> statement-breakpoint
-- Only memberships already owned by the reviewed Master import ledger are
-- promoted. Development overlay/source_topic/ordinary slugs are not approval.
UPDATE "vocabflow_app"."vocabulary_topics" vt SET review_status = 'APPROVED'
WHERE EXISTS (SELECT 1 FROM "vocabflow_app"."master_vocabulary_topic_memberships" m
  WHERE m.vocabulary_id = vt.vocabulary_id AND m.topic_id = vt.topic_id);
--> statement-breakpoint
-- Legacy exact source mappings are canonical imported classifications.
UPDATE "vocabflow_app"."vocabulary_topics" vt SET review_status = 'APPROVED'
FROM "vocabflow_app"."topics" t, "vocabflow_app"."vocabularies" v
WHERE vt.topic_id = t.id AND vt.vocabulary_id = v.id
  AND v.source_dataset IS DISTINCT FROM 'VOCABFLOW_MASTER_V2_DEV'
  AND t.source_topic IS NOT NULL AND t.source_topic = v.topic;
--> statement-breakpoint
UPDATE "vocabflow_app"."topics" t SET review_status = 'APPROVED'
WHERE EXISTS (SELECT 1 FROM "vocabflow_app"."master_topic_mappings" m WHERE m.topic_id = t.id)
   OR EXISTS (SELECT 1 FROM "vocabflow_app"."vocabulary_topics" vt
     WHERE vt.topic_id = t.id AND vt.review_status = 'APPROVED');
--> statement-breakpoint
-- These five edges are explicit in pinned taxonomy 2.0.1, not inferred from
-- similar names. Both nodes must retain the exact source code/slug pair.
UPDATE "vocabflow_app"."topics" child SET parent_topic_id = parent.id
FROM "vocabflow_app"."topics" parent,
  (VALUES ('fruit','FRUIT','food','FOOD'), ('desserts','DESSERTS','food','FOOD'),
          ('rivers','RIVERS','nature','NATURE'), ('government','GOVERNMENT','society','SOCIETY'),
          ('computer-science','COMPUTER_SCIENCE','technology','TECHNOLOGY'))
  AS edge(child_slug,child_code,parent_slug,parent_code)
WHERE child.slug = edge.child_slug AND parent.slug = edge.parent_slug
  AND child.source_topic = edge.child_code AND parent.source_topic = edge.parent_code
  AND child.parent_topic_id IS NULL AND child.id <> parent.id;

--> statement-breakpoint
UPDATE "vocabflow_app"."topics" child SET parent_topic_id = parent_map.topic_id
FROM "vocabflow_app"."master_topic_mappings" child_map,
     "vocabflow_app"."master_topic_mappings" parent_map,
     (VALUES
       ('01a0fc13-09e8-700a-8d88-7673162c64ac'::uuid,'01a0fc13-09e8-77b1-a4af-0bad3bc4e263'::uuid),
       ('01a0fc13-09e8-717f-a0ec-bd3e1bf30e37'::uuid,'01a0fc13-09e8-77b1-a4af-0bad3bc4e263'::uuid),
       ('01a0fc13-09e9-7ad6-8997-01a8459fdbd3'::uuid,'01a0fc13-09e8-7960-8072-7e3ed30f2c15'::uuid),
       ('01a0fc13-09e9-7447-8df1-9f6402ecee6d'::uuid,'01a0fc13-09e9-7bba-9e0f-eec7b021693c'::uuid),
       ('01a0fc13-09e9-7952-9f4d-3931203ef4e5'::uuid,'01a0fc13-09e9-7704-bb7e-9205c751d69e'::uuid)
     ) AS edge(child_master_id,parent_master_id)
WHERE child_map.master_topic_id = edge.child_master_id
  AND parent_map.master_topic_id = edge.parent_master_id
  AND child.id = child_map.topic_id AND child.parent_topic_id IS NULL
  AND child.id <> parent_map.topic_id;
