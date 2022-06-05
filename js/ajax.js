//发送请求
async function sendAxio(api,myheaders,method){
    var headers = new Headers(),
    keys = Object.keys(myheaders);
    for (key of keys) {
        let val = myheaders[key];
        headers.append(key, val);
    }

    var requestOptions = {
        method: method,
        headers: headers,
        redirect: 'follow'
    };
    let res = await fetch(api, requestOptions),
    txt = await res.text();
    return txt;
}
