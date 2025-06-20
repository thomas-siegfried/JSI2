import { lifetimeSymbol, InjectSymbol } from "./Symbols";
import {
  PerContextLifetimeManager,
  PerRequestLifetimeManager,
} from "./Lifetime";
import { Root } from "./index";

//Adds injection metadata from constructor parameters
export function Inject(...params: any[]) {
  return function (target: any) {
    var injectTypes = params;
    if (injectTypes.length <= 0) {
      injectTypes = getInjectParams(target);
    }
    target[InjectSymbol] = injectTypes;
  };
}

function getInjectParams(obj: any) {
  //return symbol value or metadata
  return obj[InjectSymbol];
}

//replace the type used for an injected param with another type
export function InjectParam(source: any) {
  return function (
    target: Object,
    propertyKey: string | symbol,
    parameterIndex: number
  ) {
    var paramTypes = getInjectParams(target);
    paramTypes[parameterIndex] = source;
    target[InjectSymbol] = paramTypes;
  };
}

//registers a class so that it is 'Required' before any other requested objects
export function Bootstrap(target: any) {
  Root.RegisterAutoInit({ Key: target });
}

//mark this class as a transient type, as opposed to the default singleton behavior
export function Transient(target: any) {
  target[lifetimeSymbol] = () => new PerRequestLifetimeManager();
}
//mark this class as contextural (singlton per context)
export function PerContext(target: any) {
  target[lifetimeSymbol] = () => new PerContextLifetimeManager();
}
