FROM node:10-alpine
LABEL maintainer="Virgil <support@VirgilSecurity.com>"
ENV USER=app
ENV HOME=/home/$USER
ARG git_commit
RUN apk add --no-cache --update ca-certificates
# not exist in alpine but dependency of crypto
RUN apk add libc6-compat

WORKDIR $HOME
# copy all files
COPY . .
# add user to run node from not-root user
RUN addgroup -S $USER && adduser -S -G $USER $USER
RUN chown -R $USER:$USER $HOME

USER $USER

# Install app dependencies
RUN npm install

ENV PORT 3000
ENV GIT_COMMIT $git_commit

EXPOSE 3000

CMD [ "npm", "start"]
