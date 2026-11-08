const rows=7,cols=8;
function seat(r,c){const pair=Math.floor(c/2),x=(pair-1.5)*3.1+(c%2===0?-.48:.48);return {id:String.fromCharCode(65+r)+(c+1),r,c,x,y:r*.36,z:5.8+r*1.65,taken:false,recliner:true,bay:r===6&&(c===2||c===5)};}
const seats=Array.from({length:rows*cols},(_,i)=>seat(Math.floor(i/cols),i%cols));
function metrics(s){return {distance:Math.hypot(s.x,s.z),fov:(Math.atan2(4.7-s.x,s.z)-Math.atan2(-4.7-s.x,s.z))*180/Math.PI,offset:Math.atan2(s.x,s.z)*180/Math.PI};}
function smooth(t){return t*t*t*(t*(t*6-15)+10)}
module.exports={seats,metrics,smooth};
