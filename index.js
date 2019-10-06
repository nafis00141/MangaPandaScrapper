let request = require('requestretry');
let cheerio = require('cheerio');
let config = require('./config');
let fs = require('fs');
let commandLineArgs = require('command-line-args')

let pipe = (f , x) => f(x);

let asyncPipe = async (f , x) => await f(x);

let asyncCompose = async (f, g, x) => await g(await f(x));

let getHtml = (uri) =>{
    return (new Promise((resolve, reject) => {
        request({url:uri, maxAttempts: config.maxAttempts, 
            retryDelay: config.retryDelay,
            retryStrategy: request.RetryStrategies.HTTPOrNetworkError}, (err, res, body) => {
            if(!err) resolve(body);
            else {
                console.log(uri);
                reject(new Error(err));
            }
        });
    }));
};


let MangaPandaLinkScrapper = async function (options) {

    let links = [];
    let $ = await asyncPipe(cheerio.load, (await getHtml(`${config.MangaPandaHostName}${options.name}`)));

    $('#listing').find('a').each( function(a,b) { links.push(`${$(this).attr('href')}`); });

    return options.chapter ? 
            links.includes(`/${options.name}/${options.chapter}`) ?
                { links: `/${options.name}/${options.chapter}`} : { links: ``} 
            : { links: links }
};

let MangaPandaChapterImageScrapper = async function (link) {
    let mainLink = link;

    let $ = pipe(cheerio.load, (await getHtml(`${config.MangaPandaHostName}${link.substr(1)}`)));

    let dir = `${link.substr(1)}`.replace(/\/.*$/,"");

    !fs.existsSync(dir) ? fs.mkdirSync(dir) : null

    dir = `./${link}`;

    !fs.existsSync(dir) ? fs.mkdirSync(dir) : null

    let links = [];

    $('#pageMenu').find('option').each( function(a,b) { links.push(`${$(this).attr('value')}`)});

    let result = [];

    links.forEach( async (singleLink, i) => { 
        let $$ = pipe(cheerio.load, await getHtml(`${config.MangaPandaHostName}${singleLink.substr(1)}`));
        result.push(search(`${$$('#img').attr('src')}`, `./${mainLink}/${paddy(i+1,3)}.jpg`));
    });

    let data = await Promise.all[result];

    return {
        message: data 
    }

};

let delay = t => new Promise(resolve => setTimeout(resolve, t));

var download = (uri, filename, callback) => {
    request({url:uri, maxAttempts: config.maxAttempts, 
        retryDelay: config.retryDelay,
        retryStrategy: request.RetryStrategies.HTTPOrNetworkError})
    .pipe(fs.createWriteStream(filename)).on('close', callback);
};

function search(url, filename) {
    return (new Promise((resolve, reject) => {
        download(url, filename, () => resolve(`done with '${filename}'`));
    }));
};

function paddy(num, padlen, padchar) {
    var pad_char = typeof padchar !== 'undefined' ? padchar : '0';
    var pad = new Array(1 + padlen).join(pad_char);
    return `${(pad + num).slice(-pad.length)}`;
}


const optionDefinitions = [
    { name: 'name', alias: 'n', type: String },
    { name: 'chapter', alias: 'c', type: Number }
]

let downloadAllChapters = async (data) => {
    //shit code
    let len = data.links.length;
    let per = config.batchSize;
    let result = [];

    console.log(`Total Chapters = ${len}`);
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

let downloadChapter = async (data) => {
    console.log("Started Downloading");
    console.log(data);
    return await MangaPandaChapterImageScrapper(data.links);
}

let downloadManga = async (data) =>  Array.isArray(data.links) ? await downloadAllChapters(data) : await downloadChapter(data);

let main = async () => await asyncCompose(MangaPandaLinkScrapper, downloadManga, commandLineArgs(optionDefinitions));

main()
  .then((val) =>
    console.log("Done Downloading")
  )
  .catch(console.error)