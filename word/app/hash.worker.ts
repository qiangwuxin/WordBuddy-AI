export type HashWorkerIn={
    type:'HASH';
    file:File;
    chunkSize:number;
}
export type HashWorkerOut={
    type:'DONE';
    hash:string;
} | {
    type:'PROGRESS',
    progress:number;
}

async function sha256ArrayBuffer(buf: ArrayBuffer): Promise<string>{
const hashBuffer = await crypto. subtle.digest ('SHA-256', buf);
const hashArray = Array. from(new Uint8Array(hashBuffer));
return hashArray.map ((b) => b. toString(16). padStart (2, '0')). join('');
}                                                                                                                                                                                                

self.onmessage=async(e:MessageEvent<HashWorkerIn>)=>{
    const msg=e.data;
    if(msg.type==='HASH'){
       const {file,chunkSize}=msg;
       const total=Math.ceil(file.size/chunkSize);
       // 二进制处理
       //`ArrayBuffer` 是 JavaScript 中用于表示**一段固定长度的二进制数据**的原始类型，
       // 常用于处理文件、网络数据（如 WebSocket）、音频视频等底层二进制操作。
       const chunks:ArrayBuffer[]=[];
       for(let i=0;i<total;i++){
        const start=i*chunkSize;
        const end =Math.min(file.size,start+chunkSize);
        //截取出一段二进制数据块
        const chunk=file.slice(start,end);
        //把它转换成可以在内存中读取的二进制格式Arraybuffer
        const buf=await chunk.arrayBuffer();
        chunks.push(buf);
        (self as any).postMessage({
            type:'PROGRESS',
            progress:(i+1)/total
        }as HashWorkerOut)
       }
       // 这行代码将多个数据块 chunks 合并，创建成一个完整的二进制对象 BLob，
       // 代表一个不可变的、连续的原始数据文件，常用于文件处理。
    const whole=new Blob(chunks);
    //whole.arrayBuffer()会返回一个promise
    //该promise在解析之后会返回包含BLOB全部数据的、只读的ArrayBuffer
    const hash=await sha256ArrayBuffer(await whole.arrayBuffer());
     (self as any).postMessage({
            type:'DONE',
           hash
        }as HashWorkerOut)
       }
    }

