import re,json
KW={
'S1':r"customer|support|refund|return|billing|escalat|get_customer|lookup_order|process_refund|order id|account issue|ticket|handoff|first-contact",
'S2':r"CLAUDE\.md|slash command|/commands|skills?/|plan mode|direct execution|@import|\.claude/rules|refactor|/memory|/compact|new hire|teammate|convention",
'S3':r"research|coordinator|subagent|synthes|citation|cite|source|report|web search|findings|provenance|hub-and-spoke",
'S4':r"codebase|legacy|Grep|Glob|\bRead\b|\bEdit\b|Bash|boilerplate|explor|MCP server|\.mcp\.json|session|--resume|fork",
'S5':r"\bCI\b|CI/CD|pipeline|pull request|\bPR\b|review|-p\b|--print|headless|false positive|test case|merge|GitHub Actions|batch",
'S6':r"extract|schema|JSON|invoice|document|tool_choice|validation|field|null|receipt|contract|downstream|few-shot",
}
TSDEF={'1.1':'S1','1.2':'S3','1.3':'S3','1.4':'S1','1.5':'S1','1.6':'S3','1.7':'S4','2.1':'S4','2.2':'S1','2.3':'S3','2.4':'S4','2.5':'S4',
 '3.1':'S2','3.2':'S2','3.3':'S2','3.4':'S2','3.5':'S2','3.6':'S5','4.1':'S5','4.2':'S6','4.3':'S6','4.4':'S6','4.5':'S6','4.6':'S5',
 '5.1':'S1','5.2':'S1','5.3':'S3','5.4':'S4','5.5':'S6','5.6':'S3'}
PRIM={'S1':['D1','D2','D5'],'S2':['D3','D5'],'S3':['D1','D2','D5'],'S4':['D2','D3','D1'],'S5':['D3','D4'],'S6':['D4','D5']}
def tag(q):
    if q.get('scenario'): return q['scenario']
    t=q['qEn']+' '+' '.join(q['optionsEn'])
    sc={k:len(re.findall(v,t,re.I)) for k,v in KW.items()}
    for k in sc:
        if q['domain'] in PRIM[k]: sc[k]+=0.5
    d=TSDEF.get(q['ts'],'S1'); sc[d]+=1.5
    return max(sc,key=sc.get)
