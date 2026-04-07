import subprocess

replies = {
    3042142468: "Fixed by explicitly resolving the path using pathlib and validating that `os.path.commonpath` matches the allowed audio base directory.",
    3042142473: "Fixed by explicitly resolving the path using pathlib and validating that `os.path.commonpath` matches the allowed audio base directory.",
    3042142476: "Fixed by explicitly resolving the path using pathlib and validating that `os.path.commonpath` matches the allowed audio base directory.",
    3042143875: "Fixed. `customFetch` now correctly handles `URL` and `Request` objects, ensuring the internal rewrite logic is seamlessly applied.",
    3042143888: "Fixed. Replaced the non-null assertion with an explicit guard that throws if `res.body` is null.",
    3042143895: "Fixed. Imported `inArray` and integrated it into the optimization query.",
    3042143897: "Fixed. Implemented the `inArray` filtering to strictly limit the query to the videos on the current page.",
    3042143902: "Fixed. Refactored the simplistic `.split(\",\")` to correctly ignore commas embedded inside quotation marks.",
    3042143911: "Fixed. Implemented time interval and step throttling to strictly limit the frequency of progress database writes.",
    3042152755: "Fixed. Scoped the `videoProcessing` target update strictly by both `videoId` and `targetLang`.",
    3042152775: "Fixed. Scoped the `videoProcessing` target update strictly by both `videoId` and `targetLang`.",
    3042152789: "Fixed. Scoped the `videoProcessing` target update strictly by both `videoId` and `targetLang`.",
    3042152800: "Fixed. Scoped the `videoProcessing` target update strictly by both `videoId` and `targetLang`.",
    3042152820: "Fixed. Scoped the `videoProcessing` target update strictly by both `videoId` and `targetLang`.",
}

for cid, reply in replies.items():
    cmd = f"gh api -X POST /repos/Jonathangadeaharder/Notflix/pulls/49/comments/{cid}/replies -f body='{reply}'"
    print(f"Replying to {cid}: {reply}")
    try:
        subprocess.check_output(cmd, shell=True)
    except subprocess.CalledProcessError as e:
        print(f"Failed to reply to {cid}: {e.output}")
