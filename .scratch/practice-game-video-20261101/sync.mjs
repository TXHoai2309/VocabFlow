import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));
const indexPath = path.join(root, 'index.json');
const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
index.sources.specApprovedSha256 ??= '406d8527821e764aa44d4fc6b1d0de03e7c6bcf42d27836f75aacca100ec7dbc';
for (const [fileKey, hashKey] of [['spec', 'specSha256'], ['approvedBreakdown', 'approvedBreakdownSha256']]) {
  const source = path.resolve(root, '../..', index.sources[fileKey]);
  index.sources[hashKey] = crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex');
}
index.approval.executionAuthorized = true;
index.approval.executionAssignment = 'Owner request 2026-11-01: execute all 21 tickets sequentially, practice → game → video; no workers/commit/push/cloud migration.';
for (const ticket of index.tickets) {
  const file = path.join(root, ticket.file);
  let body = fs.readFileSync(file, 'utf8').replace('**Execution authorized:** no', '**Execution authorized:** yes — owner assigned 2026-11-01');
  if (ticket.id === '01') body = body.replace('**Status:** planned', '**Status:** in_progress').replace('(không có blocker kỹ thuật; chưa được giao thực thi)', '(không có blocker kỹ thuật; đã được giao 2026-11-01)');
  fs.writeFileSync(file, body);
  ticket.status = body.match(/\*\*Status:\*\* (\w+)/)[1];
  ticket.executionAuthorized = true;
  const bytes = fs.readFileSync(file);
  ticket.sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  ticket.bytes = bytes.length;
}
const done = index.tickets.filter(t => t.status === 'done').map(t => t.id);
index.executionPolicy.authorizedExecutionFrontier = index.tickets.filter(t => t.status !== 'done' && t.blockedBy.every(id => done.includes(id))).map(t => t.id);
fs.writeFileSync(indexPath, JSON.stringify(index, null, 2) + '\n');
let readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
const count = status => index.tickets.filter(t => t.status === status).length;
readme = readme.replace(/\*\*Trạng thái:\*\*[^\r\n]+/, `**Trạng thái:** ${count('planned')} planned, ${count('in_progress')} đang thực hiện, ${count('done')} hoàn tất, ${count('blocked')} blocked. **Execution authorized: yes — owner assigned 2026-11-01.**`)
  .replace('Đây là kế hoạch đã xuất, chưa phải giao code/phát hành. Từng story cần đạt gate hiện hữu khi được giao.', 'Chủ sản phẩm đã giao thực thi 21 ticket trong chat ngày 2026-11-01. Story/technical contract phải đạt gate trước code. Phát hành là bước riêng.')
  .replace('còn frontier đã giao là rỗng.', 'frontier đã giao theo index; vẫn chỉ một story đang triển khai.');
for (const t of index.tickets) readme = readme.replace(new RegExp(`(\\| ${t.id} \\|[^\\r\\n]*\\| )\\w+( \\|)`), `$1${t.status}$2`);
fs.writeFileSync(path.join(root, 'README.md'), readme);
console.log(JSON.stringify({ done: count('done'), active: count('in_progress'), blocked: count('blocked'), planned: count('planned') }));
