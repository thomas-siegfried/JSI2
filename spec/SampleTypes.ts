import { Inject, Bootstrap, InjectParam } from "../src/index.js";

export class Service {
  serviceName: string;
  getServiceName() {
    return this.serviceName;
  }
}

export class SubService extends Service {}

export interface SimplePersonArgs {
  firstname?: string;
  lastname?: string;
}
export class SimplePerson {
  constructor(args?: SimplePersonArgs) {
    if (args) Object.assign(this, args);
  }
  firstname: string;
  lastname: string;
  Announce() {
    return `${this.firstname} ${this.lastname}`;
  }
}

@Inject(Service)
export class Person {
  constructor(public svc: Service) {}
  public svc2: Service;
  firstname: string;
  lastname: string;
}
@Inject(SubService)
export class ServiceClient {
  constructor(public svc: Service) {}
}

@Bootstrap
@Inject(Person)
export class PersonNamer {
  constructor(person: Person) {
    person.firstname = "Smithfeld";
  }
}
