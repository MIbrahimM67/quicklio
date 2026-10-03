const PNG_SIG=[137,80,78,71,13,10,26,10];
const u32=(bytes,o)=>((bytes[o]<<24)|(bytes[o+1]<<16)|(bytes[o+2]<<8)|bytes[o+3])>>>0;
const put32=(arr,o,v)=>{arr[o]=(v>>>24)&255;arr[o+1]=(v>>>16)&255;arr[o+2]=(v>>>8)&255;arr[o+3]=v&255};
function crcTable(){const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0}return t}const CRC=crcTable();
export function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=CRC[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0}
export const dpiToPixelsPerMeter=dpi=>Math.max(1,Math.round(Number(dpi)*39.37007874015748));
export const pixelsPerMeterToDpi=ppm=>Number(ppm)/39.37007874015748;

export function readPngDpi(input){const b=input instanceof Uint8Array?input:new Uint8Array(input);if(PNG_SIG.some((v,i)=>b[i]!==v))return null;let o=8;while(o+12<=b.length){const len=u32(b,o),type=String.fromCharCode(...b.slice(o+4,o+8));if(type==='pHYs'&&len===9){const unit=b[o+16];if(unit!==1)return null;return{x:pixelsPerMeterToDpi(u32(b,o+8)),y:pixelsPerMeterToDpi(u32(b,o+12))}}o+=12+len}return null}
export function setPngDpi(input,dpi){const b=input instanceof Uint8Array?input:new Uint8Array(input);if(PNG_SIG.some((v,i)=>b[i]!==v))throw new Error('Not a PNG file');const ppm=dpiToPixelsPerMeter(dpi);let o=8,physStart=-1,ihdrEnd=-1;while(o+12<=b.length){const len=u32(b,o),type=String.fromCharCode(...b.slice(o+4,o+8));if(type==='IHDR')ihdrEnd=o+12+len;if(type==='pHYs'&&len===9){physStart=o;break}o+=12+len}
  const chunk=new Uint8Array(21);put32(chunk,0,9);chunk.set([112,72,89,115],4);put32(chunk,8,ppm);put32(chunk,12,ppm);chunk[16]=1;put32(chunk,17,crc32(chunk.slice(4,17)));
  if(physStart>=0){const out=b.slice();out.set(chunk,physStart);return out}if(!ihdrEnd)throw new Error('PNG is missing IHDR');const out=new Uint8Array(b.length+21);out.set(b.slice(0,ihdrEnd),0);out.set(chunk,ihdrEnd);out.set(b.slice(ihdrEnd),ihdrEnd+21);return out}

function isJpeg(b){return b.length>=4&&b[0]===0xff&&b[1]===0xd8}
export function readJpegDpi(input){const b=input instanceof Uint8Array?input:new Uint8Array(input);if(!isJpeg(b))return null;let i=2;while(i+4<b.length&&b[i]===0xff){const marker=b[i+1];if(marker===0xd9||marker===0xda)break;const len=(b[i+2]<<8)|b[i+3];if(marker===0xe0&&len>=16&&String.fromCharCode(...b.slice(i+4,i+9))==='JFIF\0'){const units=b[i+11],x=(b[i+12]<<8)|b[i+13],y=(b[i+14]<<8)|b[i+15];if(units===1)return{x,y};if(units===2)return{x:x*2.54,y:y*2.54};return null}if(len<2)break;i+=2+len}return null}
export function setJpegDpi(input,dpi){const b=input instanceof Uint8Array?input:new Uint8Array(input);if(!isJpeg(b))throw new Error('Not a JPEG file');const d=Math.max(1,Math.min(65535,Math.round(Number(dpi)||300)));let i=2;while(i+4<b.length&&b[i]===0xff){const marker=b[i+1];if(marker===0xd9||marker===0xda)break;const len=(b[i+2]<<8)|b[i+3];if(marker===0xe0&&len>=16&&String.fromCharCode(...b.slice(i+4,i+9))==='JFIF\0'){const out=b.slice();out[i+11]=1;out[i+12]=(d>>8)&255;out[i+13]=d&255;out[i+14]=(d>>8)&255;out[i+15]=d&255;return out}if(len<2)break;i+=2+len}
  const seg=new Uint8Array([0xff,0xe0,0x00,0x10,0x4a,0x46,0x49,0x46,0x00,0x01,0x01,0x01,(d>>8)&255,d&255,(d>>8)&255,d&255,0x00,0x00]);const out=new Uint8Array(b.length+seg.length);out.set(b.slice(0,2),0);out.set(seg,2);out.set(b.slice(2),2+seg.length);return out}
