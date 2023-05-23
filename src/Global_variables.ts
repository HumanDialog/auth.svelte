export class Global_variables
{
    public set(key :string, value :string, permanent :boolean = false) :void
    {
        if(permanent)
            localStorage.setItem(key, value);
        else
            sessionStorage.setItem(key, value);
    }

    public set_num(key :string, value :number, permanent :boolean = false) :void
    {
        if(permanent)
            localStorage.setItem(key, value.toString());
        else
            sessionStorage.setItem(key, value.toString());
    }

    public has(key :string) :boolean
    {
        let v = sessionStorage.getItem(key);
        if( (v != undefined) && (v != ""))
            return true;
        else
        {
            v = localStorage.getItem(key);
            if( (v != undefined) && (v != ""))
                return true;
            else
                return false;
        }
    }

    public get(key :string, out :(val :string) => void) : boolean       // usage: if(!get('somekey', (v) => { scopedValue=v; } )) ...
    {
        let v = sessionStorage.getItem(key);
        if( (v != undefined) && (v != ""))
        {
            out(v);
            return true;
        }
        else
        {
            v = localStorage.getItem(key);
            if( (v != undefined) && (v != ""))
            {
                out(v);
                return true;
            }
            else
                return false;
        }
    }

    public get_num(key :string, out :(val :number) => void) : boolean       
    {
        let vs :string;
        const ret = this.get(key, (v)=>{ vs=v; });
        if(ret)
            out( parseInt(vs) );
        
        return ret;
    }
}

export let gv :Global_variables = new Global_variables;