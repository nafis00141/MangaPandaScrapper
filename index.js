let request = require('requestretry');
let cheerio = require('cheerio');
let config = require('./config');
let fs = require('fs');
let commandLineArgs = require('command-line-args')

MangaPandaLinkScrapper = async function (mangaName, chapterNumber) {
    let res = await getHtml(`${config.MangaPandaHostName}${mangaName}`);
    let $ = cheerio.load(res);
    let links = [];

    $('#listing').find('a').each( function(a,b) {
        let resp = $(this).attr('href')
        links.push(`${resp}`);
    })

    if(chapterNumber) {
        if(links.includes(`/${mangaName}/${chapterNumber}`)) {
            console.log(` chapter = ${chapterNumber} is present; `);
            return {
                links: `/${mangaName}/${chapterNumber}`
            };
        }
    }
    else {
        return {
            links: links
        };

    }
};

MangaPandaChapterImageScrapper = async function (link) {
    
        let res = await getHtml(`${config.MangaPandaHostName}${link.substr(1)}`);
        let $ = cheerio.load(res);
        let name = `${link.substr(1)}`;
        let dir = name.replace(/\/.*$/,"");

        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir);
        }

        dir = `./${link}`;

        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir);
        }

        let links = [];

        $('#pageMenu').find('option').each( function(i,b) {
            let link = $(this).attr('value');
            links.push(link);
        })

        let result = [];

        let totalLinks = links.length;

        for(let i=0; i<totalLinks; i++){

            let html = await getHtml(`${config.MangaPandaHostName}${links[i].substr(1)}`);
            let $$ = cheerio.load(html);
            let imageLink = $$('#img').attr('src');

            let z = await search(`${imageLink}`, `./${link}/${paddy(i+1,3)}.jpg`);
            result.push(z);

        }

        return {
            message: result 
        }

};

let delay = t => new Promise(resolve => setTimeout(resolve, t));

var download = function(uri, filename, callback){
    request({url:uri, maxAttempts: config.maxAttempts, 
        retryDelay: config.retryDelay,
        retryStrategy: request.RetryStrategies.HTTPOrNetworkError}).pipe(fs.createWriteStream(filename)).on('close', callback);
};

function search(url, filename) {
    return (new Promise((resolve, reject) => {
        download(url, filename, function(){
            resolve(`done with '${filename}'`);
        });
    }));
};

function paddy(num, padlen, padchar) {
    var pad_char = typeof padchar !== 'undefined' ? padchar : '0';
    var pad = new Array(1 + padlen).join(pad_char);
    return (pad + num).slice(-pad.length);
}

let getHtml = function(uri){
    return (new Promise((resolve, reject) => {
        request({url:uri, maxAttempts: config.maxAttempts, 
            retryDelay: config.retryDelay,
            retryStrategy: request.RetryStrategies.HTTPOrNetworkError}, function(err, res, body) {
            if(!err) resolve(body);
            else {
                console.log(uri);
                reject(new Error(err));
            }
        });
    }));
};

const optionDefinitions = [
    { name: 'name', alias: 'n', type: String },
    { name: 'chapter', alias: 'c', type: Number }
  ]

main = async function() {
    const options = commandLineArgs(optionDefinitions)
    let data = await MangaPandaLinkScrapper(options.name, options.chapter);
    if(Array.isArray(data.links)){
        
        let len = data.links.length;
        let per = config.batchSize;
        let result = [];
        console.log(`Total Chapters = ${len}`)
        console.log("Started Downloading");
        for(let j =0;j<len/per;j++) {
            console.log(`start = ${j*per} ---- end = ${Math.min((j*per)+per,len)}`);
            let task = [];
            for(let i=j*per;i<Math.min((j*per)+per,len);i++) {
                task.push(MangaPandaChapterImageScrapper(data.links[i]));
            }
            let res = await Promise.all(task);
            result.push(...res);
            await delay(config.batchDelay);
        }
        return result;
    }
    else {
        console.log("Started Downloading");
        let res = await MangaPandaChapterImageScrapper(data.links);
        return res;
    }
}

main()
  .then(function(val){
    console.log("Done Downloading")
  })
  .catch(console.error)