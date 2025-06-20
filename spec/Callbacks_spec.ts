import * as JSI from "../src/index";
import { Inject, Root } from "../src/index";

import createSpy = jasmine.createSpy;

class MyClass {
  name: string = "myclass";
}

@Inject(MyClass)
class MyService {
  constructor(public cls: MyClass) {}
}

describe("jsi callbacks", () => {
  it("executes callback when Resolve is called", () => {
    let j = Root.ChildScope();
    let spy = createSpy();
    j.callbacks.Resolve = spy;
    j.Resolve<MyClass>(MyClass);
    expect(spy).toHaveBeenCalledWith(MyClass, []);
  });

  it("Executes Resolved callback with key and resolved object", () => {
    let j = Root.ChildScope();
    let spy = createSpy();
    j.callbacks.Resolved = spy;
    let obj = j.Resolve<MyClass>(MyClass);
    expect(spy).toHaveBeenCalledWith(MyClass, obj, []);
  });

  it("calls Resolved callback for dependency resolutions", () => {
    let j = Root.ChildScope();
    let spy = createSpy();
    j.callbacks.Resolved = spy;
    let obj = j.Resolve<MyService>(MyService);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("executes callbacks on parent injectors also", () => {
    let j = Root.ChildScope();
    let j2 = j.ChildScope();
    let spyResolve = createSpy();
    let spyResolve2 = createSpy();
    let spyResolved = createSpy();
    let spyResolved2 = createSpy();
    j.callbacks.Resolve = spyResolve;
    j2.callbacks.Resolve = spyResolve2;
    j.callbacks.Resolved = spyResolved;
    j2.callbacks.Resolved = spyResolved2;
    var obj = j2.Resolve<MyClass>(MyClass);
    expect(spyResolve).toHaveBeenCalledWith(MyClass, []);
    expect(spyResolve2).toHaveBeenCalledWith(MyClass, []);
    expect(spyResolved).toHaveBeenCalledWith(MyClass, obj, []);
    expect(spyResolved2).toHaveBeenCalledWith(MyClass, obj, []);
  });
});
