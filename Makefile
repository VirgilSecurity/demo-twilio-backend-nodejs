.PHONY: docker
docker: build_docker

IMAGENAME=virgil-demo-twilio-server-v5
DOCKER_REGISTRY=virgilsecurity-docker-core.bintray.io

define tag_docker
  @if [ "$(GIT_BRANCH)" = "master" ]; then \
    docker tag $(IMAGENAME) $(DOCKER_REGISTRY)/services/$(IMAGENAME):latest; \
		docker tag $(IMAGENAME) $(DOCKER_REGISTRY)/services/$(IMAGENAME):$(GIT_COMMIT); \
  else \
  	docker tag $(IMAGENAME) $(DOCKER_REGISTRY)/services-dev/$(IMAGENAME):latest; \
    docker tag $(IMAGENAME) $(DOCKER_REGISTRY)/services-dev/$(IMAGENAME):$(GIT_COMMIT); \
  fi
endef

define push_docker
  @if [ "$(GIT_BRANCH)" = "master" ]; then \
    docker push $(DOCKER_REGISTRY)/services/$(IMAGENAME):latest; \
		docker push $(DOCKER_REGISTRY)/services/$(IMAGENAME):$(GIT_COMMIT); \
  else \
  	docker push $(DOCKER_REGISTRY)/services-dev/$(IMAGENAME):latest; \
    docker push $(DOCKER_REGISTRY)/services-dev/$(IMAGENAME):$(GIT_COMMIT); \
  fi
endef

build_docker:
	docker build -t $(IMAGENAME) --build-arg git_commit=$(GIT_COMMIT) .

docker_registry_tag:
	$(call tag_docker)

docker_registry_push:
	$(call push_docker)

docker_inspect:
	docker inspect -f '{{index .ContainerConfig.Labels "git-commit"}}' $(IMAGENAME)
	docker inspect -f '{{index .ContainerConfig.Labels "git-branch"}}' $(IMAGENAME)

clean_docker_registry:
	@echo ">>> Cleaning Bintray registry"
	docker run --rm -e "REGISTRY_USERNAME=${REGISTRY_USERNAME}" -e "REGISTRY_PASSWORD=${REGISTRY_PASSWORD}" \
	virgilsecurity-docker-core.bintray.io/utils/bintraymgr:latest \
	clean -t 10 core services-dev/$(IMAGENAME)

	docker run --rm -e "REGISTRY_USERNAME=${REGISTRY_USERNAME}" -e "REGISTRY_PASSWORD=${REGISTRY_PASSWORD}" \
	virgilsecurity-docker-core.bintray.io/utils/bintraymgr:latest \
	clean -t 10 core services/$(IMAGENAME)
