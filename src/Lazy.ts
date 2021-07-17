import {IInjector} from './Interface';
import 'reflect-metadata'
import {getInitializers} from './Initializers';
export function Lazy<TYPE=any,PROP=any>(args?:ILazyOptions<TYPE,PROP>|InitFunction<TYPE,PROP>){
    var options : ILazyOptions<TYPE,PROP> = {};
    if(args){
        if(typeof args=="function"){
            options.init=args;
        } else{
            options = args;
        }
    }
    return function(prototype:Object,propName:string){
        let key=options.key;   //key can be specified in args   
        if(!key){
            key=Reflect.getMetadata("design:type",prototype,propName);  //read key from prop type
        }
        let initializers = getInitializers(prototype);
        //create an initializer which overrides the property with a lazy property
        initializers.push((inj:IInjector,target:any)=>{
            var value =null;
            let propOptions ={
                get : function(){
                    if(!value){
                        value=inj.Resolve(key);
                        //inline init function provided, call it with the created object and this context
                        if(options.init){  
                            options.init(target,value);
                        }
                    }
                    return value;
                },
                enumerable:true,
                configurable:true
            };
            Object.defineProperty(target,propName,propOptions);
        });
    }
}


export interface ILazyOptions<T,K>{
    key?:any;
    init?:InitFunction<T,K>
}

export interface InitFunction<T,K>{
    (obj:T,val:K):void
}


