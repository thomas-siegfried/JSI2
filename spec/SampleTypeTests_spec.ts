import * as JSI from "../src/index";
import { Injector, InjectParam, Inject } from "../src/index";
import {
  Service,
  Person,
  PersonNamer,
  ServiceClient,
  SubService,
} from "./SampleTypes";
import { Person as Prs } from "./SampleTypes";

describe("SampleTypes", () => {
  var jsi: Injector;
  beforeEach(() => {
    jsi = new Injector();
  });
  it("can resolve imported types", () => {
    let j = jsi.ChildScope();
    let p = j.Resolve<Person>(Person);
    let s = j.Resolve<Service>(Service);
    expect(p).toBeDefined();
    expect(s).toBeDefined();
  });

  it("resolves alias as the same type", () => {
    let j = jsi.ChildScope();
    let p1 = j.Resolve<Person>(Person);
    let p2 = j.Resolve<Person>(Prs);
    expect(p1).toBe(p2);
  });

  it("same type resolved in different context should be the same", () => {
    let j = jsi.ChildScope();
    let s1 = j.Resolve<Service>(Service);
    let p1 = j.Resolve<Person>(Person);
    expect(s1).toBe(p1.svc);
  });

  it("bootstraps correctly", () => {
    let j = jsi.ChildScope();
    j.RegisterAutoInit({ Key: PersonNamer });
    let p1 = j.Resolve<Person>(Person);
    expect(p1.firstname).toBe("Smithfeld");
  });

  it("Allows auto dependencies to be overrridden by InjectParam decorator", () => {
    let j = jsi.ChildScope();
    let c = j.Resolve<ServiceClient>(ServiceClient);
    expect(c.svc).toBeInstanceOf(SubService);
  });
});
