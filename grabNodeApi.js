var http = require("http"),
    url = require("url"),
    fs = require("fs");

// 基准目录选择
var baseUrl = "http://nodejs.org";

// 抓取页面url，除了文件部分
var apiUrl = "http://nodejs.org/api";

// 需要存储的本地文件位置
var dirPath = __dirname + '/nodejsAPI';

// url管理
var gmap = {

    // 当前url表
    url : [],

    // 已抓过url表
    urled : [],

    urlPush : function(url){
        // 如果当前url表没有，已抓过url表也没有，push进url表
        if(this.url.indexOf(url) == -1 && this.urled.indexOf(url) == -1){
            this.url.push(url);
        }
    },

    urledPush : function(url){
        // 如果已抓过url表没有，push进去
        if(this.urled.indexOf(url) == -1){
            this.urled.push(url);
        }
    }
}

// 是否开启debug信息
var isDebug = true;

function gbug(msg){
    isDebug && console.log(msg);
}

// 判断类型
function isType(obj, type){
    return Object.prototype.toString.call(obj).toLowerCase() == "[object " + type + "]".toLowerCase();
}

// 创建文件
function cdir(root, name){

    !fs.existsSync(root) && fs.mkdirSync(root);

    if(!name) return;
    var path;

    if(isType(name, "array")){
        for(var i = 0, len = name.length; i < len; i++){
            if(!name[i]) continue;
            path = root + '/' + name[i];
            !fs.existsSync(path) && fs.mkdirSync(path);
        }
    }else{
        path = root + '/' + name;
        !fs.existsSync(path) && fs.mkdirSync(path);
    }
}

// 生成对应文件
function cfile(htmlStr, url){
    var uc = url.split(baseUrl);
    var dirpp = '', dircc;

    // 过滤内容
    htmlStr = htmlStr
        .replace(/<div id="column2" class="interior">[\s\S^<div]*?<\/div>/im, '')
        .replace(/<div id="intro" class="interior">[\s\S^<div]*?<\/div>/im, '')
        .replace(/<div id="footer">[\s\S^<div]*?<\/div>/im, '')
        .replace(/<script>[\s\S^<script]*?<\/script>/gim, '')
        .replace(/<a href=".*\.json">View as JSON<\/a>/gim, '');

    if(uc && uc[1]){
        dircc = uc[1].split("/");
        if(dircc.length > 2){
            var pathTemp = dirPath, pathTm;
            for(var i = 1; i < dircc.length-1; i++){
                cdir(pathTemp, dircc[i]);
                pathTemp += "/" + dircc[i];
            }
        }

        dirpp = dirPath + '/' + uc[1];

        // 不管有没有文件，都更新
        fs.writeFile(dirpp, htmlStr);

        // 如果有文件，不更新
        // !fs.existsSync(dirpp) && fs.writeFile(dirpp, htmlStr);
    }
}

// 获取html
function gHtml(url){

    // 如果已抓过该url，跳过
    if(gmap.urled.indexOf(url) > -1){
        getOther();
        return;
    }

    // 标记已抓过
    gmap.urledPush(url);

    gbug("Get:" + url);

    http.get(url, function(res){
        var str = '';

        res.on("data", function(chunk){
                str += chunk;
            })
            .on('end', function(){
                uhtml(str, url);
            })
            .on("error", function(err){
                gbug("gHtml res error:" + err.message);
            });

    }).on("error", function(err){
        gbug("gHtml get error:" + err.message);
    });
}

// 操作html
function uhtml(htmlStr, url){

    // 生成文件
    cfile(htmlStr, url);

    gbug("Create:" + url);

    // 简单正则
    var rlink = /<a href="([\w\d_-]+\.html)">/gim;
    var rcss = /<link.*?href="(.*\.css)">/gim;
    var rjs = /<script.*?src="(.*\.js)">/gim;
    var ec, lr;

    // 获取links
    while(ec = rlink.exec(htmlStr)){
        lr = apiUrl + '/' + ec[1];
        gmap.urlPush(lr);
    }

    // 获取css
    while(ec = rcss.exec(htmlStr)){
        lr = apiUrl + '/' + ec[1];
        gmap.urlPush(lr);
    }

    // 获取js
    while(ec = rjs.exec(htmlStr)){
        lr = apiUrl + '/' + ec[1];

        // 处理有../上层路径的情况
        if(ec[1].indexOf('../') > -1){
            var ud = apiUrl.split("/");
            ud.pop();
            lr = ud.join("/") + "/" + ec[1].split("../")[1];
        }
        
        gmap.urlPush(lr);
    }

    // 继续抓取
    getOther();
}

// 抓取其他
function getOther(){
    var html;
    while(html = gmap.url.pop()){
        gHtml(html);
        break;
    }
}

// 入口
function gRun(){

    gbug("Begin Grab...");

    // 创建文件夹
    cdir(dirPath);

    // 获取html并创建
    gHtml(apiUrl + '/index.html');
}

// 执行...
gRun();