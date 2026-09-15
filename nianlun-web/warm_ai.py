# -*- coding: utf-8 -*-
"""
预热 AI 结果。演示前跑一次。
──────────────────────────────────────────────────────────────────
把 cache/ 里已经查回来的每一句话，都先让 AI 跑一遍「挑句」和「输入形态」，
结果落盘到 cache/_ai/。之后线上每次搜索都是 0.01 秒命中缓存 ——
不预热的话，第一次访问要等后台跑完（实测 8 秒到 2 分钟不等）。

用法：
    cd "F:\\work palce\\nianlun-web"
    python warm_ai.py              # 预热全部
    python warm_ai.py 买房是最好的投资   # 只预热指定的一句或多句
"""
import glob
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import ai        # noqa: E402
import server    # noqa: E402


def cached_queries():
    out = []
    for p in sorted(glob.glob(os.path.join(server.CACHE, "*.json"))):
        name = os.path.splitext(os.path.basename(p))[0]
        if not name.startswith("_"):
            out.append(name)
    return out


def main():
    if not ai.available():
        print("没读到 AI_API_KEY，先配好密钥再预热。")
        return 1

    queries = sys.argv[1:] or cached_queries()
    if not queries:
        print("cache/ 里没有可预热的话。")
        return 1

    base, _key, model = ai.config()
    print("模型 %s @ %s" % (model, base))
    print("要预热 %d 句\n" % len(queries))

    t_all = time.time()
    for i, q in enumerate(queries, 1):
        t0 = time.time()
        status = server.warm(q)
        print("  [%d/%d] %-28s %6.1fs  %s"
              % (i, len(queries), q, time.time() - t0, status))
    print("\n全部完成，用时 %.1fs" % (time.time() - t_all))
    return 0


if __name__ == "__main__":
    sys.exit(main())
