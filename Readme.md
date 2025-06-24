# JSI - The JavaScript Injector

A simple dependency injection utility for JavaScript.

## Overview

JSI is a dependency injection utility for JavaScript using Register/Resolve pattern common to other DI containers. JSI does not participate in bundling or script loading. Lifetime management is supported, components can be registered as singleton, transient, or scoped. Hierarchical injectors facilitate unit testing. JSI has no external dependencies.

## Quick Start

Install the package from NPM

```shell
npm install -S @thomas-siegfried/jsi
```

Optionally, enable decorators in your typescript config

```json
/// in tsconfig.json, enable experimentalDecorators
{
  "compilerOptions": {
    "experimentalDecorators": true
  }
}
```

Define your types normally. If a type has dependencies, apply the @Inject() decorator to specify the specific dependency types.

```typescript
/// declare your types normally
export class TypeA {}
///If a class has dependencies, apply the @Inject attribute to specify dependencies
@Inject(TypeA)
export class TypeB {
  constructor(private A: TypeA) {}
}
```

At a convienent entry point for you application, after scripts have loaded, use an injector to resolve a core object which can launch your application.

```typescript
import { Injector } from "@thomas-siegfried/jsi";
window.addEventListener("DOMContentLoaded", () => {
  const inj = new Injector();
  var app: MyApp = inj.resolve<MyApp>(MyApp);
  app.doSomethingFun();
});
```

## Architecture

### Injectors

The core of the JSI framework is the Injector class. The injector maintains a list of registrations that map a key to a factory function and list of dependencies. A call to Resolve() will match the key to a registration and invoke the factory function. Any dependencies will be create using the same login and will be passed as parameter to the factory.

A single Injector known as the Root injector is exported from js-inject. Normally all interaction is done with the root injector, however in some cases it is useful to create child injectors.

### Hierarchical Injectors

A ChildScope can be created from the Root Injector. It will share Registrations with its parent but will always have its own resolutions, meaning its own set of Singletons. This can be helpful in testing.

A ChildScopedContext is a Child injector which shares resolutions with its parent. This can be useful in your application when you want to receive new instances of Scoped resources, but still have shared instances of singletons.

```typescript
import { Root } from "@thomas-siegfried/jsi";
var child: Injector = root.ChildScope(); // create a child scope
var scope: Injector = root.CreateScopedContext(); // scoped context
```

## Usage

JSI follows a bsic register/resolve patttern simmilar to traditional IOC containers. Dependencies are provided by constructor injection. Services can be registered manually using the API, or by using decorators.

### Class Based Resolution

The simplest way to use JSI is to create classes with dependencies in their constructor, and use the @Inject decorator to register dependencies.

```typescript
class MyService {
  this.Name = "Service Name";
}
@Inject(MyService)
class MyClass {
  constructor(private svc:MyService){}
  this.ServiceName = svc.Name;
}

//in app startup
const jsi = new Injector();
var cls:MyClass = jsi.Resolve(MyClass);
```

### Manual Registration

Dependencies can be configured in the Injector manually using the API,

```typescript
//in app startup
const jsi = new Injector();
jsi.Register(MyClass, [MyService]); //dependencies specified as array
var cls: MyClass = jsi.Resolve(MyClass);
```

### Register Functions

Registrations and dependencies can be functions instead of classes, and are handled the same

```typescript
function GetConfiguration(){
  return {
    prop1:'value1'
    prop2:'value2'
  }
}

@Inject(GetConfiguration)
function MyClass(private configuration:any) {
}
```

## Lifetime Management

Any component registered with a JSI injector is a singleton by default. The first time the component is Resolved, or created as a dependency of another component, the instance is cached. Any further resolutions of that component will return the same object.

Registrations can be configured with a Transient or Scoped lifetime. Transient registrations will resolve to a new object every time. Scoped registrations will be unique per ScopedContext. Registration lifetime can be specified by the API or decorators.

### Singleton

Default behavior is a singleton for each resolution.

```typescript
class MyService {}

@Inject(MyService)
class FirstModel {
  constructor(public service: MyService);
}
@Inject(MyService)
class SecondModel {
  constructor(public service: MyService);
}

var first = jsi.Resolve(FirstModel);
var second = jsi.Resolve(SecondModel);
first.service == second.service;
```

### Transient

Transient registrations are created on each call

```typescript
//decorator to declare the type as Transient
@Transient
class MyService {}
//optionally registered via api
jsi.RegisterTransient(MyService);

@Inject(MyService)
class FirstModel {
  constructor(public service: MyService);
}
@Inject(MyService)
class SecondModel {
  constructor(public service: MyService);
}

var first = jsi.Resolve(FirstModel);
var second = jsi.Resolve(SecondModel);
first.service !== second.service;
```

### Per Context

Per-Context registrations are unique per Scoped Context

```typescript
@PerContext
class MyService {}
//optionally registered via api
jsi.RegisterPerContext(MyService);

@Inject(MyService)
class FirstModel {
  constructor(public service: MyService);
}
@Inject(MyService)
class SecondModel {
  constructor(public service: MyService);
}

var first = jsi.Resolve(FirstModel);
var second = jsi.Resolve(SecondModel);
//same instance from single injector
first.service == second.service;
s;

//different instance from child injector
var scopedFirst = jsi.CreateScopedContext().Resolve(FirstModel);
first.service !== scopedFirst.service;
```

### Dependencies can be resolved from global scope

Injector will attempt to resolve dependencies from global scope if they are not found via explicit registration. If a dependency is a function, the injector will attempt to instantiate an object (via new or object.create()).

```typescript
class MyClass {
  constructor($: any) {
    //$(.selector)....
  }
}
//will resolve jquery from global scope (if it exists)
jsi.Register(MyClass, ["$"]);
```

## Startup Behavior

There are some rare occasions where you have code that needs to execute, which needs to consume dependencies, but is not directly imported anywhere. JSI can allow for this via Registration callbacks, and Bootstrap registrations

The first time an object is Resolve(d) from an Injector, the injector performs it's initialization logic, which consists for running all Registration callback functions, and Resolving all Bootstrap registrations

### Registration Callbacks

A registration callback is method that will be invoked after all resources are registered but before any objects are resolved.

```typescript
Root.RegisterCallback(() => {
  //resolve objects
  Root.Resolve<SomeType>(SomeType);
  //or operate on global objects that should all be loaded at this point
  window.???;
});
```

### Bootstrap Registrations

Bootstrap objects are Resolved automatically by the Injector after Registered Callbacks are executed, but before any manual Resolutions take place. These objects are created and pull in dependencies and run constructor logic. This will happen before any explicit calls to Resolve() are executed. The object will then be cached an available as a dependency to other objects.

```typescript
@Bootstrap
export class AppInitComponent {
  constructor(/*... dependencies*/) {
    //setup the config object based on whatever
  }
}
//RegisterAutoInit is equivalent to @Bootstrap decorator
jsi.RegisterAutoInit(AppInitComponent);
```

## Lazy Dependency Resolution

jsi cannot resolve cyclical dependencies, where ClassA depends on ClassB which in turn depends on ClassA. This will cause an error when resolving any of these types. Cyclical dependencies can be resolved using Lazy injection.

### Lazy Properties

Lazy dependency injection relies on a the Lazy helper class. The Lazy class can be imported as a constructor dependency. Methods on the Lazy class are used to configured Lazily resolved properties. This is acheived by redefining the PropertyDescriptor with a Getter that resolves from the Injector that created the object.

It is important to not access this property in the object constructor, as this will result in an exception if a cyclic dependency is requested.

```typescript
class MyClass {
  constructor(lazy: Lazy) {
    lazy
      .For(this) //configure the helper for our class
      .Prop((x) => service, MyService); //property, and dependency key
  }
  //field re-written as a property, service will be resolved on first access
  service: MyService;
}
```

### Lazy property initialization

In some cases a consumer object will need to execute code against a dependency when it is resolved. Normally this would occur in the constructor, which cannot be done with Lazy properites. Instead this is specified in a callback method on the .Prop() call

```typescript
class MyClass {
  constructor(lazy: Lazy) {
    lazy.For(this).Prop(
      (x) => service,
      MyService,
      (svc) => svc.initialize(/*??*/) //this method will be invoked with the resolved value when the property is accessed.
    );
  }
  service: MyService;
}
```

## Service Locator Pattern

If a component/object needs to resolve other objects at runtime, it can depend on Injector. The Injector recieved will be the one that resolved the object.

```typescript
export class MyComponent {
  constructor(public myJsi: Injector) {}
}
var localInjector = new Injector();
const cmp = localInjector.Resolve<MyComponent>(MyComponent);
cmp.myJsi == localInjector; //true
```
