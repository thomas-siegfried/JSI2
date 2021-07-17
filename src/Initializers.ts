/*
    Initializers are a list of functions to customize an object after it is created by an Injector
    embedded on a type by way of a Symbol property
    Currently only used by Lazy Initialization
*/
import {IInjector} from './Interface';
let  Initializers = Symbol();
interface Initializer{
    (injector:IInjector,target:any):void;
}
export function getInitializers(proto:any):Array<Initializer>{
    let initializers = (proto[Initializers]=(proto[Initializers]||[])) as Array<Initializer>;
    return initializers;
}
export function initializeObject(target:any,inj:IInjector){
    let lst = getAllInitializers(target);
    lst.forEach(init=>init(inj,target));
}
function getAllInitializers(obj:any){
    var lst=new Array<Initializer>();
    var proto = Object.getPrototypeOf(obj);
    while(proto!=null){
        lst=[...lst,...getInitializers(proto)];
        proto=Object.getPrototypeOf(proto);
    }
    return lst;
}