"""Record presentation memberships separately from frozen production content."""
from collections import Counter
import csv
import hashlib
import io
import json
from pathlib import Path

ROOT = Path('vocabflow-dataset/workspaces/editorial-refresh-20261029/basic-plus-500-r0001')


def main():
    source = ROOT / 'dataset-text-r0001.json'
    raw = source.read_bytes()
    data = json.loads(raw)
    changes = {'movement': 'community-life', 'life': 'health-body'}
    assignments = []
    for item in data['items']:
        topic = changes.get(item['headword'], item['topicCodes'][0])
        assignments.append({
            'itemId': item['itemId'], 'headword': item['headword'],
            'sourceContentSha256': item['contentSha256'],
            'sourceTopicCodes': item['topicCodes'], 'displayTopicCodes': [topic],
            'displayCollectionCodes': ['basic-plus-500-r0001', 'basic-plus-500-' + topic],
        })
    counts = Counter(row['displayTopicCodes'][0] for row in assignments)
    assert len(assignments) == 500 and len({row['itemId'] for row in assignments}) == 500
    assert set(counts) == {topic['code'] for topic in data['topics']}
    assert set(counts.values()) == {25}
    assert sum(row['sourceTopicCodes'] != row['displayTopicCodes'] for row in assignments) == 2
    result = {
        'artifactType': 'SUPPLEMENTARY_COLLECTION_MEMBERSHIP',
        'sourceDataset': {'path': source.as_posix(), 'sha256': hashlib.sha256(raw).hexdigest()},
        'reason': 'movement is a social movement; life is a lifetime. Display membership only; frozen source sense, content hashes, exactText and media jobs unchanged.',
        'canonicalImportPerformed': False, 'topicCounts': dict(counts),
        'assignments': assignments,
    }
    target = ROOT / 'collection-memberships-r0001.json'
    output = (json.dumps(result, ensure_ascii=False, indent=2) + '\n').encode('utf8')
    if target.exists():
        assert target.read_bytes() == output, 'IMMUTABLE_MEMBERSHIP_CONFLICT'
    else:
        target.write_bytes(output)
    rows = {item['itemId']: item for item in data['items']}
    topics = {topic['code']: topic['labelVi'] for topic in data['topics']}
    rank = {code: index for index, code in enumerate(topics)}
    table = io.StringIO(newline='')
    writer = csv.writer(table)
    writer.writerow(['entryCode', 'topic', 'topicVi', 'cefr', 'headword', 'partOfSpeech', 'meaningVi', 'definitionEn', 'exampleEn', 'exampleVi', 'existingRuntimeVocabularyId', 'itemId'])
    for membership in sorted(assignments, key=lambda row: (rank[row['displayTopicCodes'][0]], rows[row['itemId']]['entryCode'])):
        item = rows[membership['itemId']]
        topic = membership['displayTopicCodes'][0]
        example = item['examples'][0]
        writer.writerow([item['entryCode'], topic, topics[topic], item['classification']['cefr'], item['headword'], item['partOfSpeech'], item['meaningVi'], item['definitionEn'], example['en'], example['vi'], item['runtimeVocabularyId'], item['itemId']])
    csv_target = ROOT / 'review-by-topic-r0001.csv'
    csv_blob = table.getvalue().encode('utf-8-sig')
    if csv_target.exists():
        assert csv_target.read_bytes() == csv_blob, 'IMMUTABLE_TOPIC_REVIEW_CONFLICT'
    else:
        csv_target.write_bytes(csv_blob)
    print(json.dumps({'memberships': 500, 'topics': len(counts), 'changedDisplayPlacements': 2, 'sourceUnchanged': source.read_bytes() == raw}))


if __name__ == '__main__':
    main()
