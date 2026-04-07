import json
import subprocess

out = subprocess.check_output("gh api /repos/Jonathangadeaharder/Notflix/pulls/49/comments", shell=True)
comments = json.loads(out)

# Map comment ID to its replies
for c in comments:
    # fetch replies for each comment? Actually, the GitHub API for pulls/comments returns replies as comments themselves, but they have `in_reply_to_id`.
    # Let's just group by ID and in_reply_to_id.
    pass

threads = {}
for c in comments:
    cid = c["id"]
    if "in_reply_to_id" in c:
        parent = c["in_reply_to_id"]
        if parent not in threads:
            threads[parent] = []
        threads[parent].append(c)
    else:
        if cid not in threads:
            threads[cid] = []

for cid, replies in threads.items():
    parent_c = next((c for c in comments if c["id"] == cid), None)
    if parent_c:
        print(f"ID: {cid}")
        print(f"Author: {parent_c['user']['login']}")
        print(f"Body snippet: {parent_c['body'][:100].replace(chr(10), ' ')}")
        print(f"Replies: {len(replies)}")
        for r in replies:
            print(f"  -> {r['user']['login']}: {r['body'][:60]}")
        print("-" * 40)
