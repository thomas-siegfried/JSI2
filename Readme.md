# JSI - The JavaScript Injector
A simple dependency injection utility for JavaScript.
## Overview
JSI is a dependency injection utility for JavaScript using Register/Resolve pattern similar to Unity. JSI does not participate in bundling or script loading. Lifetime management is supported, components can be registered as singleton, per-resolve, or custom lifetime. Hierarchical injectors facilitate unit testing. JSI has no external dependencies.
##  Usage
JSI follows a bsic register/resolve patttern simmilar to traditional IOC containers.  Services can be registered manually using the API, uing decorators, or implicity by Type.
### Basic Registration
Register a constructor function using a key, a list of dependencies, and a factory method.  Dependencies are resolved and injected into the constructor function.  
```javascript
jsi.Register('key',[],()=>{ return {}};
```
### Resolve an object
Resolve a registered object by providing a key.  The global injector will maintain a singleton reference by default.
```javascript
var obj = jsi.Resolve('key');
```

### Declare Dependencies
Any dependencies declared in a registration are resolved and injected into the constructor function of the registration.
```javascript 
jsi.Register('myService',[],()=>{
	return { 
	   ServiceMethod:()=>{}
	}
}
jsi.Register('client',['myService'],(svc)=>{
	 this.service=svc;
	 this.callServiceMethod =()=>{
		 return svc.ServiceMethod();
	}
}
```
### Registrations can be constructor functions
```javascript
function MyService(){
	this.Name="Service Name";
}
function MyClass(svc){
	this.ServiceName=svc.Name;
}
// Key is assumed to by factory method, if no factory method is provided
jsi.Register(MyService,[]);
jsi.Register(MyClass,[MyService]);
var cls = jsi.Resolve(MyClass);

```

### Registrations can of course also be classes.  Example in typescript.
```typescript
class MyService{
	Name:string;
	constructor(){
		this.Name='Service Name';
	}
}
class MyClass{
	ServiceName:string;
	constructor(svc:MyService){
		this.ServiceName=svc.Name;
	}
}
jsi.Register(MyService,[]);
jsi.Register(MyClass,[MyService]);
var cls = jsi.Resolve<MyClass>(MyClass);
```
## Implicit Registration
Not all dependencies need to be registered, a dependency can be a variable on global scope or an explicit type
### Dependencies can be resolved from global scope
Injector will attempt to resolve dependencies from global scope if they are not found via explicit registration.  If a dependency is a function, the injector will attempt to instantiate an object (via new or object.create()). 
```typescript
class MyClass{
	constructor($:any){
		//$(.selector)....
	}
}
//will resolve jquery from global scope (if it exists)
jsi.Register(MyClass,['$'])
```
### We can also resolve items from types directly, even if not registered
```typescript
class MyService{
	Name:string;
	constructor(){
		this.Name='Service Name';
	}
}
jsi.Resolve(MyService);
```
### A type can specify its own dependencies
A class can specify its own dependencies by applying the @Inject decorator.  Dependencies will be inferred from constructor parameters. Dependency key can be specified for a specific parameter with the @InjectParam decorator
```typescript
import {Inject} from 'js-inject';
@Inject
class MyClass{
	constructor(private svc:MyService, 
    @InjectParam('key') private svc2:OtherService){
	}
}
```
A class or constructor function can also specify dependencies via by convention by providing a method named 'inject', which returns an array of dependencies in the same format expected by the Register method.
```typescript
class MyClass{
	ServiceName:string;
	constructor(svc:MyService){
		this.ServiceName=svc.Name;
	}
	static inject=()=>{return [MyService];}
}
```
## Lifetime Management
Any component registered with a JSI injector is a singleton by default.  The first time the component is Resolved, or created as a dependency of another component, the instance is cached.  Any further resolutions of that component will return the same object.
```typescript
class MyClass{}
jsi.Register(MyClass,[]);
var obj = jsi.Resolve<MyClass>(MyClass);
var obj2 = jsi.Resolve<MyClass>(MyClass);
//obj===obj2 (true)
```
### Per Call Lifetime
A registration can specify a different lifetime by instead calling RegisterOptions() which accepts additional parameters including an ILifetimeManager.  JSI includes two implementations of ILifetimeManager; SingletonLifetimeManager (the default) maintains a single instance across all resolutions, and PerRequestLifetimeManager, which creates a new instance each time a component is requested. 
```typescript
class MyPerRequestClass{}
jsi.RegisterOptions({
	Key:MyPerRequestClass,
	LifetimeManager:new JSI.PerRequestLifetimeManager()
});
let obj1=jsi.Resolve<MyPerRequestClass>(MyPerRequestClass);
let obj2=jsi.Resolve<MyPerRequestClass>(MyPerRequestClass);
//obj1!==obj2
```
### Specifying Object Lifetime
Singleton or per request lifetime can be specified as a registration option or by applying decorators to the dependency type
```typescript
jsi.RegisterOptions({
    Key:MyType,
    //An instance of ILifetimeManager
	LifetimeManager:new JSI.PerRequestLifetimeManager() 
})
//shortcut to specify Per Request lifetime
jsi.RegisterTransient(MyType);
//Shortcut for a singleton with a specific instance
jsi.RegisterSingleton(MyType,new MyType());
//attribute to specifify PerRequest lifetime
@Transient
class MyType{}
```
## Hierarchical Injectors
The core of the JSI framework is the Injector class.  When components are registered with an Injector, they are stored in a registration list.  When a component is resolved, a resolution object is created from the registration and cached in the injector.  The resolution object is then used to create all future instances of the object.  

A single Injector known as the Root injector is exported from js-inject, and is also added to the global namespace.   Normally all interaction is done with the root injector, however in some cases it is useful to create child injectors
```typescript
Import {Root} from 'js-inject';
var childInjector = Root.ChildScope();
```
The child injector maintains its own list of registrations and resolutions.  When an attempt is made to resolve a component on a child injector, the child searches its own list of registrations, the passes the request to its parent if a local registration is not found.  

If a registration is found, a resolution is created on the child injector, even if the registration was found on the parent.  Instances resolved from an Injector are never shared with a different injector unless they are registered as a singleton.  This is useful in unit testing situations where we want to start each test with a clean slate.
```typescript
class MyClass(){}
jsi.Register('key',[],MyClass);

//some jasmine tests
describe('MyClass',()=>{
	it('has behavior a',()=>{
		var scope = jsi.ChildScope();
		var obj=scope.Resolve<MyClass>('key');
		//object 'obj' is cached on the child scope
		//after test completes, this scope disappears along with all resolved objects
	});
	it('has behavior b',()=>{
		//create a new child scope
		var scope = jsi.ChildScope();
		//this object, and any dependencies will be created fresh
		var obj=scope.Resolve<MyClass>('key');
	});
});
```

## Startup Behavior
There are occasions where you have code that needs to execute, which needs to consume dependencies, but is not directly imported anywhere.  js-inject has two features for accomodating this need.

The first time an object is Resolve(d) from an Injector, the injector performs it's initialization logic, which consists for running all Registration callback functions, and Resolving all AutoInit registrations
### Registration Callbacks
A registration callback is method that will be invoked after all resources are registered but before any objects are resolved.
```typescript
jsi.RegisterCallback(()=>{
    //resolve objects
    jsi.Resolve<SomeType>(SomeType);
    //or operate on global objects that should all be loaded at this point
    window.$.xxx
});
```
### AutoInit Registrations
AutoInit objects are Resolved automatically by the Injector after Registered Callbacks are executed, but before any manual Resolutions take place

Example library has a configuration element and one or more components that consume that configuration
```typescript
export class LibraryConfig{
    someSetting:string;
}
@Inject()
export class LibraryComponent{
    constructor(config:LibraryConfig){
        //read config
    }
}
```

In the consumping application, a bootstrapped component consumes and configures the LibraryConfig.  The component can be configured as AutoInit via explicit registartion, or by using the @Bootstrap decorator

```typescript
@Bootstrap  
export class AppInitComponent{
    constructor(config:LibraryConfig){
        //setup the config object based on whatever
    }
}

//use this or the @Bootstrap decorator
jsi.RegisterAutoInit(AppInitComponent);
```

The main application module, can consume the LibraryComponent, which will be configured by the time we get it

```typescript
export class App{
    constructor(cmp:LibraryComponent){}
}
```
## Lazy Dependency Resolution
js-inject cannot resolve cyclical dependencies, where ClassA depends on ClassB which in turn depends on ClassA.  This will cause an error when resolving any of these types. Cyclical dependencies can be resolved using Lazy injection.

### Lazy Properties
Lazy dependency injection relies on a property decorator.  The @Lazy decorator can be applied to a field. This field will be re-written using Object.defineProperty to include a getter which will resolve to the correct type using the Injector which initially created the object

It is important to not access this property in the object constructor, as this will result in an exception if a cyclic dependency is requested.

```typescript
class MyClass{
    @Lazy()
    service:MyService;
}
```

### Lazy property initialization
In some cases a consumer object will need to execute code against a dependency when it is resolved.  Normally this would occur in the constructor, which cannot be done with Lazy properites.

```typescript 
class MyClass{
    @Lazy((host,svc)=>host.configureService(svc))
    service:MyService;
    configureService(service:MyService){
        //configure service, subscribe to events etc
    }
}
```
## Service Locator Pattern
If a component/object needs to resolve other objects at runtime, it can depend on Injector.  The Injector recieved will be the one that created the object.

```typescript
export class MyComponent{
    constructor(public myJsi:Injector){}
}

const cmp = jsi.Resolve<MyComponent>(MyComponent);
cmp.myJsi==jsi; //true

```

### Quickstart using TypeScript
js-inject has many options for registering and resolving objects, however if you are using typescript the following guide demonstrates the fastest way to get up and running.


Enable experimental decorators and decorator metadata
```json
/// in tsconfig.json, enable experimentalDecorators
{
    "compilerOptions": {
        "experimentalDecorators": true,
        "emitDecoratorMetadata": true
    }
}
```

Define your types normally.  If a type has dependencies, apply the @Inject() decorator to infer dependencies from the constructor.
```typescript
/// declare your types normally
export class TypeA{

}
///If a class has dependencies, apply the @Inject attribute to infer dependencies
@Inject()
export class TypeB{
    constructor(private A:TypeA){}
}
```

At a convienent entry point for you application, after scripts have loaded, use the Root injector to resolve a core object which can launch your application

```typescript
import {Root} from 'js-inject';
window.addEventListener('DOMContentLoaded',()=>{

   var app:MyApp = Root.resolve<MyApp>(MyApp);
   app.doSomethingFun();
}); 
```