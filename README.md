# MangaPanda Scrapper
A simple tool to download manga from mangapanda.com

## Installation
Just clone this repo and do `npm install`.

## How To Use
At first get the name of your manga from MangaPanda (Go to the website and get the name from link). For `Dr.Stone` manga the link is `https://www.mangapanda.com/dr-stone` So the name is `dr-stone`

To download all chapter run the following command from cloned directory

 ```
 node index.js --name dr-stone
 ```
To download specific chapter(say 45) run the following

```
 node index.js --name dr-stone --chapter 45
```

## Configuration
You can change the configuration based on your preference

### Default Configuration
```
config.retryDelay = 50; \\ retry after 50ms if a image download fails
config.maxAttempts = 100; \\ retry max 100 times
config.batchSize = 10; \\ when downloading all chapters make a batch of 10 chapters
config.batchDelay = 3000; \\ After each batch wait 3s.
```