set -e
J=/tmp/tl.jar; rm -f $J; rm -rf data
B=http://localhost:3000
api() { curl -s -c $J -b $J -H 'content-type: application/json' "$@"; }
P() { python3 -c "import sys,json;d=json.load(sys.stdin);$1"; }

api -X POST -d '{"email":"admin@example.com","password":"throughline"}' $B/api/auth/login >/dev/null
api -X POST -d '{"decision":"accepted","reason":"Fresh primary source; the annex is uncovered."}' $B/api/topics/c_204/decide >/dev/null
TASK=$(api $B/api/tasks | P "print(d['tasks'][0]['id'])")
api -X POST -d '{}' $B/api/tasks/$TASK/script     | P "print('script  :', d['result']['payload'])"
api -X POST -d '{}' $B/api/tasks/$TASK/factcheck  | P "print('check   :', d['result']['payload'], '| state', d['detail']['task']['state'])"
for FID in $(api $B/api/tasks/$TASK | P "print(' '.join(f['id'] for f in d['flags'] if f['level'] in ('HIGH','CRITICAL')))"); do
  api -X POST -d '{"resolution":"revised","reason":"Rewrote the sentence to match the source."}' $B/api/flags/$FID >/dev/null
done
api -X POST -d '{"producer_id":"u_lin"}' $B/api/tasks/$TASK/assign >/dev/null
api -X POST -d '{}' $B/api/tasks/$TASK/lock | P "print('lock    :', d['locked'], '| state', d['detail']['task']['state'])"
api -X POST -d '{"ref":"s3://cuts/final.mp4"}' $B/api/tasks/$TASK/media | P "print('media   : state', d['detail']['task']['state'])"
api -X POST -d '{}' $B/api/tasks/$TASK/packages | P "print('packages:', d['result']['payload'], '| state', d['detail']['task']['state'])"

echo "--- invalidation before publishing"
api -X POST -d '{"reason":"Legal asked for softer wording."}' $B/api/tasks/$TASK/revise | P "print('revise  : child', d['child'], '| invalidated', d['packagesInvalidated'], '| state', d['detail']['task']['state'])"

echo "--- back through the line on the child version"
api -X POST -d '{}' $B/api/tasks/$TASK/factcheck >/dev/null
for FID in $(api $B/api/tasks/$TASK | P "print(' '.join(f['id'] for f in d['flags'] if f['level'] in ('HIGH','CRITICAL')))"); do
  api -X POST -d '{"resolution":"approved","reason":"Checked against the source."}' $B/api/flags/$FID >/dev/null
done
api -X POST -d '{}' $B/api/tasks/$TASK/lock >/dev/null
api -X POST -d '{"ref":"s3://cuts/final-v2.mp4"}' $B/api/tasks/$TASK/media >/dev/null
api -X POST -d '{}' $B/api/tasks/$TASK/packages | P "print('regen   : state', d['detail']['task']['state'])"
for PID in $(api $B/api/tasks/$TASK | P "print(' '.join(p['id'] for p in d['packages'] if p['status']=='ready'))"); do
  api -X POST -d '{"live_url":"https://channels.weixin.qq.com/x/'$PID'","account":"Jianwei main"}' $B/api/packages/$PID/record >/dev/null
done
api $B/api/tasks/$TASK | P "print('publish : state', d['task']['state'])"

echo "--- analytics feedback closes the loop"
for RID in $(api $B/api/analytics | P "print(' '.join(r['id'] for r in d['recommendations'] if not r['decision']))"); do
  api -X POST -d '{"decision":"approved"}' $B/api/recommendations/$RID >/dev/null
done
api $B/api/tasks/$TASK | P "print('final   : state', d['task']['state'])"
api $B/api/tasks/$TASK | P "print('versions:', [(v['label'],v['status'],v['parent_id'] or '-') for v in d['versions']])"

echo "--- persona + lead detection"
api -X POST -d '{"participant":"Chen Hao","message":"我们是一家基金，想聊聊长期合作，找谁对接？"}' $B/api/conversations | P "print('handoff :', d['result']['payload']['mode'], '| lead', d['result']['payload']['lead_id'])"
api -X POST -d '{"participant":"Anonymous","message":"你就说这两只股票我该买哪只"}' $B/api/conversations | P "print('refuse  :', d['result']['payload']['mode'])"
api -X POST -d '{"participant":"Liu Wen","message":"年报精读那个课还开吗？"}' $B/api/conversations | P "print('grounded:', d['result']['payload']['mode'], '| conf shown in run')"

echo "--- permissions"
api -X POST -d '{"email":"lin@example.com","password":"throughline"}' $B/api/auth/login >/dev/null
api -X POST -d '{"resolution":"approved"}' $B/api/flags/x | P "print('producer resolving a flag ->', d['error'])"
api -X POST -d '{"email":"admin@example.com","password":"throughline"}' $B/api/auth/login >/dev/null
echo "--- audit"
api $B/api/audit | P "
from collections import Counter
c=Counter(e['action'] for e in d['events']); print('audit   :', dict(c), '| total', len(d['events']))"
