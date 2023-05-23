//import base64url from "base64url";

export class Token
{
    private _raw        :string;
    public header       :object;
    public payload      :object;
    
    constructor(token :string, parse_as_jwt :boolean =true)
    {
        this._raw = token;

        if(!parse_as_jwt)
            return;

        let parts :string[];
        parts = token.split('.');

        let sheader = parts[0];
        let spayload = parts[1];
        
        sheader = this.decode_base64url(sheader);
        spayload = this.decode_base64url(spayload);

        this.header = JSON.parse(sheader);
        this.payload = JSON.parse(spayload);
    }

    public get raw() :string
    {
        return this._raw;
    }

    public get is_jwt()   :boolean
    {
        if(this.header == undefined)
            return false;

        if(this.header == null)
            return false;

        if(this.header["typ"] === "JWT")
            return true;
        else
            return false;
    }

    public get not_expired()    :boolean
    {
        let exp :number | undefined;
        exp = this.get_claim<number>("exp");
        if(exp === undefined)
            return false;
        
        const now = Math.floor(Date.now() / 1000);
        if(exp > now+15)
            return true;
        
        return false;
    }

    public get_claim<T>(key :string) : T | undefined
    {
        if(this.payload == undefined)
            return undefined;

        if(this.payload == null)
            return undefined;

        let v : T | undefined;
        v = this.payload[key];
        if(v === undefined)
            return undefined;

        return v;
    }

    private decode_base64url(input :string) :string
    {
        
        let output :string = input;
 
        output = output.replace('-', '+'); 
        output = output.replace('_', '/');
    
        switch (output.length % 4)
        {
            case 0:
                break;
            case 2:
                output += "==";
                break;
            case 3:
                output += "=";
                break;
            default:
                return "";
        }
    
        return atob(output);
    }
}