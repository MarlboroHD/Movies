const express = require('express');
const { addonBuilder, getRouter } = require('stremio-addon-sdk');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const manifest = {
    id: 'com.yourmoviestreamsaddon',
    version: '1.0.0',
    name: 'Your Movie Streams',
    description: 'Addon serving a list of specific movies',
    resources: ['catalog', 'stream', 'meta'],
    types: ['movie'],
    idPrefixes: ['tt'],
    catalogs: [{
        type: 'movie',
        id: 'yourmoviestreams-movies',
        name: 'Your Movie Streams',
        genres: ['All'],
        extra: [
            { name: 'genre' },
            { name: 'skip' }
        ]
    }]
};

const files = fs.readdirSync(__dirname);
const movieFile = files.find(file => file.includes('updated_movies') && path.extname(file) === '.json');

if (!movieFile) {
    throw new Error("No file with 'updated_movies' found in its name.");
}

const movies = JSON.parse(fs.readFileSync(path.join(__dirname, movieFile), 'utf8'));

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(args => {
    if (args.type === 'movie' && args.id === 'yourmoviestreams-movies') {
        const metas = movies.map(movie => ({
            id: movie.tt_id,
            type: 'movie',
            name: movie.name,
            description: movie.overview,
            aliases: [movie.name]
        }));
        return Promise.resolve({ metas });
    } else {
        return Promise.resolve({ metas: [] });
    }
});

builder.defineMetaHandler(args => {
    const movie = movies.find(movie => movie.tt_id === args.id);
    if (movie) {
        return Promise.resolve({
            meta: {
                id: movie.tt_id,
                type: 'movie',
                name: movie.name,
                description: movie.overview
            }
        });
    } else {
        return Promise.resolve({});
    }
});

builder.defineStreamHandler(args => {
    const movie = movies.find(movie => movie.tt_id === args.id);
    if (movie) {
        return Promise.resolve({
            streams: [{
                title: movie.name,
                url: movie.url
            }]
        });
    } else {
        return Promise.resolve({ streams: [] });
    }
});

const addonInterface = builder.getInterface();
const app = express();

app.use(cors());

app.use('/', getRouter(addonInterface));

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something went wrong!');
});

const PORT = process.env.PORT || 7001;
app.listen(PORT, () => {
    console.log(`Addon server running on port ${PORT}`);
});
