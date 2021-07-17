import * as JSI from '../src/index';
import createSpy = jasmine.createSpy;
import { SimplePerson,Person,Service } from './SampleTypes';
declare const window:any,global:any;
//either the window, or empty global for testing.
const _global:any = (0,eval)('this');

const jsi = JSI.Root;

export class MyClass {
    name: string = 'myclass';
}

export class InjClass {
    constructor(public cls: MyClass) {
    }

    static inject = function () {
        return [MyClass];
    };
}

export class JQueryTester {
    constructor(public jq: any) {
    }
}
@JSI.Transient
export class Vagrant{

}




describe('jsi', () => {
    it('exists', () => {
        expect(JSI).toBeDefined('JSI Namespace not defined');
        expect(jsi).toBeDefined('jsi global object not defined');
    });

    it('returns null with invalid key',()=>{
        var i =jsi.ChildScope();
        var obj =i.Resolve('test');
        expect(obj).toBeFalsy();
    });

    it('allows simple registration', () => {
        var i = jsi.ChildScope();
        i.Register('simple', [], () => {
            var s = new MyClass();
            s.name = "Fred";
            return s;
        });
        var obj: MyClass = <MyClass>i.Resolve('simple');
        expect(obj.name).toBe('Fred');
    });

    it('allows registration by type', () => {
        var i = jsi.ChildScope();
        i.Register(MyClass, [], MyClass);
        var obj = <MyClass>i.Resolve(MyClass);
        expect(obj.name).toBe('myclass');
    });

    it('allows multiple simple object registrations that do not squish each other', () => {
        //objects can be keys for the registration
        var i = jsi.ChildScope();
        var x = {x:1};
        var y = {y:2};
        i.Register(x, [], () => x);
        i.Register(y, [], () => y);
        var x2 = i.Resolve(x);
        var y2 = i.Resolve(y);
        expect(x2).toBe(x);
        expect(y2).toBe(y);
    });

    it('allows a type to declare dependencies via a static inject property', () => {
        var i = jsi.ChildScope();
        i.Register(InjClass);
        i.Register(MyClass);
        var injClass = <InjClass>i.Resolve(InjClass);
        expect(injClass.cls.name).toBe('myclass');
    });

    it('allows resolution of unregistered types', () => {
        var i = jsi.ChildScope();
        var mc = i.Resolve(MyClass);
        expect(mc).toBeDefined();
    });

    it('unregistered types are singletons', () => {
        var i = jsi.ChildScope();
        var mc = i.Resolve(MyClass);
        expect(mc).toBeDefined();
        let mc2 = i.Resolve(MyClass);
        expect(mc2).toBe(mc);
    });
    //these tests will only run in a browser context
    //if(typeof(window)!=='undefined') {
        it('allows resolution of global variables', () => {
            var i = jsi.ChildScope();
            var fakeJQuery = {};
            _global['$'] = fakeJQuery;
            var $ = i.Resolve('$');
            expect($).toBe(fakeJQuery);
        });
    
        it('Does not attempt to instantiate objects resolved from global with string keys', () => {
            //items resolved from global with string keys are not instantiated.  Prevents injection from trying to object.create something like $ or _.
            var i = jsi.ChildScope();
            var myfun = () => {
                return 0;
            };
            _global.myfun = myfun;
            var resolved = i.Resolve('myfun');
            //resolve the function, not the result of the function
            expect(resolved).not.toBe(0);
        });
    
        it('allows resolution of globals as a dependency', () => {
    
            var i = jsi.ChildScope();
            var fakeJQuery = {};
            _global['$'] = fakeJQuery;
            i.Register(JQueryTester, ['$']);
            var jqt = i.Resolve(JQueryTester) as JQueryTester;
            expect(jqt.jq).toBe(fakeJQuery);
        });
    //}

    it('prevents re-registering the same value', () => {
        var i = jsi.ChildScope();
        i.Register('test',[], () => 'some value' );
        expect(() => { i.Register('test', [], () => 'some other value') }).toThrow();
    });

    it('allows re-registering in a child scope', () => {
        var i = jsi.ChildScope();
        i.Register('test', [], () => 'some value');
        var ii = i.ChildScope();
        ii.Register('test', [], () => 'some other value');
    });

    it('provides singleton instances by default', () => {
        var i = jsi.ChildScope();

        i.Register('obj',[], () => {
            return new MyClass();
        });

        var obj1 = i.Resolve('obj');
        var obj2 = i.Resolve('obj');
        expect(obj1).toBe(obj2);
    });

    it('resolves new objects in different child scopes', () => {
        var i = jsi.ChildScope();

        i.Register('obj', [], () => {
            return new MyClass();
        });

        var ii = i.ChildScope();
        var obj1 = ii.Resolve('obj');
        var iii = i.ChildScope();
        var obj2 = iii.Resolve('obj');
        expect(obj1).not.toBe(obj2);
    });

    it('allows explicit per call resolution', () => {
        var i = jsi.ChildScope();
        i.RegisterOptions({
            Key: 'obj',
            Dependencies: [],
            Factory: () => { return new MyClass(); },
            LifetimeManager:new JSI.PerRequestLifetimeManager()
        });

        var obj1 = i.Resolve('obj');
        var obj2 = i.Resolve('obj');
        expect(obj1).not.toBe(obj2);
    });

    it('executes registration callbacks when resolving the first time ',()=>{
       let s1 =createSpy('test');
       let i =jsi.ChildScope();
       i.RegisterCallback(s1);
       i.RegisterInstance('main',{});
       const obj =i.Resolve('main');
       expect(s1).toHaveBeenCalled();
    });

    it('executes registration callbacks on parent injectors ',()=>{
        let s1 =createSpy('test');
        let s2 = createSpy('test2');
        let i =jsi.ChildScope();
        i.RegisterCallback(s1);
        i.RegisterInstance('main',{});
        let i2 =i.ChildScope();
        const obj2 =i2.Resolve('main');
        expect(s1).toHaveBeenCalled();
    });

    it('resolves Injector to itself',()=>{
        jsi.RegisterInstance('ninjas','are cool');//define ninjas

        var jsi2 = jsi.ChildScope();
        jsi2.RegisterInstance('ninjas','are awesome');//redefine ninjas

        //robots should receive the injector that created it, and thus resolve awesome
        jsi.Register('robots',[JSI.Injector],(inj)=>{
            return inj.Resolve('ninjas');
        });
        var val =jsi2.Resolve('robots');
        expect(val).toBe('are awesome');
    });

    it('allows shortcut transient registration',()=>{
        var i = jsi.ChildScope();
        i.RegisterTransient(MyClass);
        var c1 = i.Resolve(MyClass);
        
        var c2 = i.Resolve(MyClass);
        expect(c1).not.toBe(c2);
    });

    it('defaults transient types to transient lifetimes',()=>{
        var i =jsi.ChildScope();
        var v1 =i.Resolve(Vagrant);
        var v2 = i.Resolve(Vagrant);
        expect(v1).not.toBe(v2);
    });

    it('respects vagrant attribute even with new Injectors?',()=>{
        var inj = new JSI.Injector();
        var v1 =inj.Resolve(Vagrant);
        var v2 = inj.Resolve(Vagrant);
        expect(v1).not.toBe(v2); 
    });

    it('maintains single instances of "init" registrations',()=>{
        //Something required with a registerInit() will be the same instance if required via Resolve or as a dependency
        var inj =jsi.ChildScope();
        var p:SimplePerson=null;
        var fac = ()=>{
            var person =new SimplePerson();
            p=person;
            return person;
        }
        inj.RegisterAutoInit({Key:fac});
        inj.EnsureInitialized();
        var firstPerson =p;
        expect(firstPerson).toBeDefined();
        var p2 = inj.Resolve<SimplePerson>(fac);
        expect(firstPerson).toBe(p2);

    });
    describe('proxies',()=>{
        it('creates proxy objects if a proxy is configured for the Resolved key',()=>{
            var inj =jsi.ChildScope();
            var spy =jasmine.createSpy();
            inj.Proxy(MyClass).get('name').before(spy);
            var c = inj.Resolve<MyClass>(MyClass);
            c.name;
            expect(spy).toHaveBeenCalled();
        });


        it('inherits proxy config from base injector',()=>{
            var jsi2= jsi.ChildScope();
            jsi.Proxy(Service).fn('getServiceName').instead(()=>'alternate');
            var person = jsi2.Resolve<Person>(Person);
            var svcName = person.svc.getServiceName();
            expect(svcName).toBe('alternate');
        });
    
    })
});

