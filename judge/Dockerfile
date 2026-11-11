# go-judge sandbox + language runtimes (C++, Java, Python).
# go-judge ships no compilers, so we copy its binary into an image that has them.
FROM criyle/go-judge:v1.9.4 AS gojudge

FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
 && apt-get install -y --no-install-recommends g++ openjdk-21-jdk-headless python3 ca-certificates \
 && rm -rf /var/lib/apt/lists/*
COPY --from=gojudge /opt/go-judge /opt/
COPY mount.yaml /opt/mount.yaml
WORKDIR /opt
EXPOSE 5050
# One job at a time: stable CPU timings that match calibration (PLAN §6).
ENTRYPOINT ["./go-judge", "-parallelism", "1"]
