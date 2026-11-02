// In ra LABS (labs.js) dạng JSON để test Python đọc.
const fs=require('fs'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','labs.js'),'utf8');
const i=src.indexOf('const LABS=');let j=i+11,d=0,q=null;
for(;j<src.length;j++){const ch=src[j];if(q){if(ch==='\\'){j++;continue}if(ch===q)q=null;continue}
 if(ch==='"'||ch==="'"||ch==='`'){q=ch;continue}if(ch==='{')d++;else if(ch==='}'){d--;if(!d){j++;break}}}
process.stdout.write(JSON.stringify(eval('('+src.slice(i+11,j)+')')));
