

export enum Mode
{
    Remote,
    Local,
    Disabled
}

export class Configuration
{
    public  mode            :Mode       = Mode.Disabled;
    
    public  iss             :string     = "";
    public  client_id       :string     = "";
    public  client_secret   :string     = "";
    public  scope           :string     = "";

    public  local_api       :string     = "";
    public  local_users     :string[]   = [];
}