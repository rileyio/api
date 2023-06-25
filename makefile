up:
	docker-compose -p kiera-api up -d

up-prod:
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml -p kiera-api up --build -d

down: 
	docker-compose -f docker-compose.yml -p kiera-api down

rm:
	docker image rm "kiera-api"

live-log:
	docker logs --follow "$(shell docker ps -a | grep "kiera-api" | cut -d ' ' -f1)"
