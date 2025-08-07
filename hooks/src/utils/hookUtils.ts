

export const flattenObj = (obj:any, parentKey = '', ans:any={})=>{
    
    for(const key in obj){
        const newKey = parentKey ? `${parentKey}.${key}` : key;
        if(Array.isArray(obj[key])){
            ans[newKey] = obj[key].join(',');
        }else if(typeof obj[key] === 'object' && obj[key]!=null){
            flattenObj(obj[key], newKey,ans);
        }else{
            ans[newKey] = obj[key];
        }
    }
    return ans;
}

