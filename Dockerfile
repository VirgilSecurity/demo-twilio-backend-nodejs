FROM node:6-alpine
MAINTAINER Virgil <support@VirgilSecurity.com>
RUN apk add --no-cache --update ca-certificates
RUN npm install -g pm2

# Bundle app files
COPY bin bin/
COPY config config/
COPY controllers controllers/
COPY services services/
COPY app.js .
COPY package.json .
COPY pm2.json .

# Install app dependencies
RUN npm install --production
ENV PORT 3000

# Show current folder structure in logs
RUN ls -al -R

EXPOSE 3000

CMD [ "pm2", "start", "pm2.json", "--no-daemon" ]