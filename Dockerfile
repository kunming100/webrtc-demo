FROM nginx
LABEL name="webrtc-demo"
LABEL version="1.0"
COPY ./dist /usr/share/nginx/html
COPY ./webrtc-demo.conf /etc/nginx/conf.d
EXPOSE 3000
