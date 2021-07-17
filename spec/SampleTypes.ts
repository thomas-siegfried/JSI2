import {Inject,Bootstrap,InjectParam} from '../src/index';

export class Service{
    serviceName:string;
    getServiceName(){
        return this.serviceName;
    }
}

export class SubService extends Service{

}

export interface SimplePersonArgs{
    firstname?:string;
    lastname?:string;
}
export class SimplePerson{
    constructor(args?:SimplePersonArgs){
        if(args)
            Object.assign(this,args);
    }
    firstname:string;
    lastname:string;
    Announce(){
        return `${this.firstname} ${this.lastname}`;
    }
}

@Inject()
export class Person{
    constructor(public svc:Service){

    }
    public svc2:Service;
    firstname:string;
    lastname:string;
}

export class ServiceClient{
    constructor(@InjectParam(SubService) public svc:Service){

    }
}

@Bootstrap
@Inject()
export class PersonNamer{
    constructor(person:Person){
        person.firstname="Smithfeld";
    }
}
