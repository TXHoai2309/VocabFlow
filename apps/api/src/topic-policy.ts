import { sql, type SQL } from "drizzle-orm";
import { APP_SCHEMA } from "@vocabflow/contracts";

/** UNION (not UNION ALL) terminates even for a malformed imported cycle. Only
 * published nodes and reviewed memberships are learner-facing. */
export function topicClosure(): SQL {
  return sql`WITH RECURSIVE topic_tree(ancestor_id, descendant_id) AS (
    SELECT id, id FROM "${sql.raw(APP_SCHEMA)}".topics
    WHERE enabled = true AND review_status = 'APPROVED'
    UNION
    SELECT tree.ancestor_id, child.id FROM topic_tree tree
    JOIN "${sql.raw(APP_SCHEMA)}".topics child ON child.parent_topic_id = tree.descendant_id
    WHERE child.enabled = true AND child.review_status = 'APPROVED'
  )`;
}

/** A correlated EXISTS preserves one row per vocabulary, including words in
 * several descendants. All identifiers below are code-owned SQL expressions. */
export function topicMembership(wordId: SQL, topicId: SQL): SQL {
  return sql`EXISTS (
    ${topicClosure()}
    SELECT 1 FROM topic_tree tree
    JOIN "${sql.raw(APP_SCHEMA)}"."vocabulary_topics" vt ON vt.topic_id = tree.descendant_id
    WHERE tree.ancestor_id = ${topicId} AND vt.vocabulary_id = ${wordId}
      AND vt.review_status = 'APPROVED'
  )`;
}
