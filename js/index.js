let accessToken = getCookie("accessToken"),
chocomemberId = getCookie("chocomemberId"),
cookie = document.cookie,    
header = {
    'authorization':accessToken,
    'cookie':cookie
},
curUrl = document.location.href,
pageInfo = Object.values(window.__INITIAL_STATE__.entities.dramaInfo.byId)[0];
if(typeof pageInfo === 'undefined' && curUrl.indexOf('ep')!==-1) {
    window.location.reload();
}
let drama_id = pageInfo.drama_id,
drama_name = pageInfo.drama_name,
current_id = getEpInfo(curUrl),
current_eps = pageInfo.current_eps,
total_eps = pageInfo.total_eps,
eps_info = pageInfo.eps_info,
epCurrent = Object.values(eps_info).filter(ep => ep.number === current_id);

function startTask (type){
    if(type === 0) {
        done(epCurrent);
    }else {
        done(eps_info);
    }
}

async function done (eps){
    let epsFrees = Object.values(eps).filter(ep => ep.svod === false),
    epVips = Object.values(eps).filter(ep => ep.svod === true),
    epVipFirst = epVips.filter((ep,index) => index === 0),
    epVipNext = epVips.filter((ep,index) => index > 0),
    frees = await sortList(epsFrees),
    vipFirst = await sortList(epVipFirst),
    vips = vipFirst;
    if(vipFirst.length !== 0 && vipFirst[0].url != undefined) {
       let vipNext = await sortList(epVipNext);
       vips = vips.concat(vipNext);
    }
    episodes = frees.concat(vips);
    if (episodes.length !== 0){
        startDown(episodes);
    }else {
        alert('请升级Vip');
    }
}

function startDown(arr){
    let batContent = 'chcp 65001',
    zip = new JSZip(),
    zipName = '',
    batName = '';
    for (let o of arr) {
        if(o.url != undefined) {
            batContent += '\r\n' + `N_m3u8DL-CLI "${o.url}" --saveName "${o.name}" --enableDelAfterDone --enableBinaryMerge`;
        }
    }
    if(arr.length === 1){
        let o = arr[0];
        batName = `${o.name}_${o.resolution}.bat`;
        zipName = `${o.name}_${o.resolution}.zip`;
    }else {
        batName = `${drama_name}.bat`;
        zipName = `${drama_name}.zip`;
    }
    if (batContent !== 'chcp 65001') {
        zip.file(batName, batContent);
        zip.generateAsync({type:'blob'}).then(function(content) {
            // see FileSaver.js
            saveAs(content, zipName);
        });    
    }else {
        alert(arr[0].error);
    }
}

async function sortList (episodes){
    let results = episodes.map(async (episode,index) => {
        let data = await getVideo(drama_id,episode.number);
        return data;
    });
    let eps = await Promise.all(results);
    return eps;
}

async function getVideo(epId,ep){
    let api = getApi(epId,ep),
    data = await sendAxio(api,header,'GET');
    data = JSON.parse(data),
    obj = {};
    if(data.code === 2000) {
        let dramaInfo = data.dramaInfo,
        name = dramaInfo.name, //剧名
        epsInfo = data.epsInfo, //信息
        eps_title = epsInfo.eps_title, //集
        linkInfo = epsInfo.source[0].links[0],
        link = linkInfo.link, // m3u8
        subtitle = linkInfo.subtitle, //vtt
        resolution = linkInfo.resolution;
        obj = {'name':`${name}_${eps_title}`,'url':link,'sub_url':subtitle,'resolution':resolution}; //清晰度
    }else {
        obj = {'error': data.message}
    }
   return obj;
}


function getEpInfo(url) {
    url = url.split(/\/|\?|&/);
    epId = url[4];
    ep = url[6];
    return Number(ep)
}

function getApi(epId,ep) {
    let api = `https://www.linetv.tw/api/part/${epId}/eps/${ep}/part?chocomemberId=${chocomemberId}`;
    return api;
}

//监听hash变化
class Dep {                  // 订阅池
    constructor(name){
        this.id = new Date() //这⾥简单的运⽤时间戳做订阅池的ID
        this.subs = []       //该事件下被订阅对象的集合
    }
    defined(){              // 添加订阅者
        Dep.watch.add(this);
    }
    notify() {              //通知订阅者有变化
        this.subs.forEach((e, i) => {
            if(typeof e.update === 'function'){
                try {
                   e.update.apply(e)  //触发订阅者更新函数
                } catch(err){
                    console.warr(err)
                }
            }
        })
    }
}
Dep.watch = null;
class Watch {
    constructor(name, fn){
        this.name = name;       //订阅消息的名称
        this.id = new Date();   //这⾥简单的运⽤时间戳做订阅者的ID
        this.callBack = fn;     //订阅消息发送改变时->订阅者执⾏的回调函数
    }
    add(dep) {                  //将订阅者放⼊dep订阅池
       dep.subs.push(this);
    }
    update() {                  //将订阅者更新⽅法
        let cb = this.callBack; //赋值为了不改变函数内调⽤的this
        cb(this.name);          
    }
}

let addHistoryMethod = (function(){
	let historyDep = new Dep();
	return function(name) {
		if(name === 'historychange'){
			return function(name, fn){
				let event = new Watch(name, fn)
				Dep.watch = event;
				historyDep.defined();
				Dep.watch = null;       //置空供下⼀个订阅者使⽤
			}
		} else if(name === 'pushState' || name === 'replaceState') {
			let method = history[name];
			return function(){
				method.apply(history, arguments);
				historyDep.notify();
			}
		}
	}
}());

//监听地址变化
window.addHistoryListener = addHistoryMethod('historychange');
history.pushState =  addHistoryMethod('pushState');
history.replaceState =  addHistoryMethod('replaceState');
window.addHistoryListener('history',function(){
    curUrl = document.location.href;
    current_id = getEpInfo(curUrl);
    epCurrent = Object.values(eps_info).filter(ep => ep.number === current_id);
});

function getCookie(cookie_name) {
    var allcookies = document.cookie;
    //索引长度，开始索引的位置
    var cookie_pos = allcookies.indexOf(cookie_name);
    // 如果找到了索引，就代表cookie存在,否则不存在
    if (cookie_pos != -1) {
        // 把cookie_pos放在值的开始，只要给值加1即可
        //计算取cookie值得开始索引，加的1为“=”
        cookie_pos = cookie_pos + cookie_name.length + 1;
        //计算取cookie值得结束索引
        var cookie_end = allcookies.indexOf(";", cookie_pos);
        if (cookie_end == -1) {
            cookie_end = allcookies.length;
        }
        //得到想要的cookie的值
        var value = unescape(allcookies.substring(cookie_pos, cookie_end));
    }
    return value;
}

//监听单集
document.addEventListener('downOneListener', function (event) {
    startTask(0);
});
//监听全集
document.addEventListener('downAllListener', function (event) {
    startTask(1);
});