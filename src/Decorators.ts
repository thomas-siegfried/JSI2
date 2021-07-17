import { lifetimeSymbol } from "./Symbols";
import { PerRequestLifetimeManager } from "./Lifetime";

//Adds injection metadata from constructor parameters
export function Inject(...params: any[]) {
    return function (target: any) {
        var injectTypes = Reflect.getMetadata('inject:paramtypes', target);
        if(!injectTypes){
            injectTypes=Reflect.getMetadata('design:paramtypes', target);
            Reflect.defineMetadata('inject:paramtypes',injectTypes,target);
        }
    }
}

//replace the type used for an injected param with another type
export function InjectParam(source: any) {
    return function (target: Object, propertyKey: string | symbol, parameterIndex: number) {
        var injectTypes = Reflect.getMetadata('inject:paramtypes', target, propertyKey);
        if (!injectTypes) {

            var paramTypes = Reflect.getMetadata('design:paramtypes', target, propertyKey).slice(0);
            Reflect.defineMetadata('inject:paramtypes', paramTypes, target, propertyKey);
            injectTypes = paramTypes;
        }
        injectTypes[parameterIndex] = source;
    }
}

//registers a class so that it is 'Required' before any other requested objects
export function Bootstrap(target: any) {
    jsi.RegisterAutoInit({ Key: target });
}

//mark this class as a transient type, as opposed to the default singleton behavior
export function Transient(target:any){
    target[lifetimeSymbol]=()=>new PerRequestLifetimeManager();
}