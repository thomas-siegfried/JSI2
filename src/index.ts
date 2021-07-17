export * from './Injector';
export * from './Decorators';
export * from './Lazy';
export * from './Utilities';
export * from './Lifetime';
import {Inject,InjectParam} from './Decorators';
import {Injector} from './Injector';

//capture global context
const _global:any = (0,eval)('this');
declare global{
    const jsi:Injector
}
//root injector
const jsi = new Injector(null,_global);
export const Root=jsi;

//default export includes reference to root injector
export default{
    Root:jsi,
    Injector,
    Inject,
    InjectParam
};


if(_global)
{
    //add global jsi reference to root injector
    _global.jsi = jsi;
}