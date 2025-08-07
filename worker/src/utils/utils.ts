
interface Conditons{
    field:string
    condition:string
    value:string
}

interface CondtionResult{
    passed: boolean
    message?:string
}

export function allConditionsPassed(allCondiitons: Conditons[], metadata:any):CondtionResult{

    for(const condtion of allCondiitons){
        const {field, condition:conditionType, value} = condtion;
        const triggerValue = metadata[field];
        if(triggerValue == null || triggerValue == undefined){
            return{
                passed: false,
                message: `Field ${field} was not found in metadata`
            };
        }
        console.log("TriggerValue: ",triggerValue); 
        let currentCheck = false;
        switch (conditionType){
            case "EQUALS":
                currentCheck = (triggerValue==value);
                break;
            case "NOT_EQUALS":
                currentCheck = (triggerValue != value);
                break;
            case "GREATER_THAN":
                currentCheck = (Number(triggerValue) > Number(value))
                break;
            case "LESS_THAN":
                currentCheck = (Number(triggerValue) < Number(value))
                break;
            case "CONTAINS":
                currentCheck = (triggerValue.toLowerCase().includes(value.toLowerCase()));
                break;
            default:
                break;
        }
        if(!currentCheck){
            return{
                passed:false,
                message: `Field: ${field} with value: ${triggerValue} failed against conditon: ${conditionType} with value ${value}`
            }
        }
    }
    return {passed:true};
}   

export function replaceFunction(input: string, metadata: any): string {
    const regex = /\{\{data\.([\w.]+?)\}\}/g;
    // console.log("Input: ",input);
    return input.replace(regex, (match, key)=>{
        // console.log("Key: ", key, " Value: ", metadata[key], "value2: ", metadata[`'${key}'`]);
        // console.log("match: ", match);
        if(metadata.hasOwnProperty(key)) return metadata[key];
        return match;
    }
)
}