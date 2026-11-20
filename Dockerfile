
FROM node:24-alpine


WORKDIR /app

# ffmpeg is used to compress uploaded videos and convert them to MP4
RUN apk add --no-cache ffmpeg
ENV FFMPEG_PATH=/usr/bin/ffmpeg \
    FFPROBE_PATH=/usr/bin/ffprobe

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5001

CMD [ "npm", "start" ]
