import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../prisma";
import '../helpers/bigInt.js'

enum PetStatus {
    LOST= 0,
    FOUND = 1,
}

export function petRoutes(fastify: FastifyInstance) {
    const vermontBurlingtonGeo = {
        lon: 44.4759,
        lat: -73.2121
    }

    fastify.get("/api/v1/pets",
    async (request:FastifyRequest, reply: FastifyReply) => {
        let ipData
        let dbBreedIds
        try {
            // @ts-ignore
            ipData = await fastify.axios.get('http://ip-api.com/json/132.198.39.21')
            console.log(ipData)
            const dbBreeds = await prisma.animal_breeds.findMany()
            dbBreedIds = dbBreeds?.map(_breed => _breed.id)
        } catch (error) {
            console.log(error)
        }
        const { lon: ipLongitude, lat: ipLatitude} = ipData?.data

        let { longitude = parseFloat(ipLatitude) || vermontBurlingtonGeo.lon, latitude = parseFloat(ipLongitude) || vermontBurlingtonGeo.lat, status = 0, radius = 10000, skip = 0, limit = 100, breed_ids = [] } = request.params as {
            longitude: number,
            latitude: number,
            radius: number,
            status: PetStatus | undefined,
            skip: number,
            breed_ids: Array<BigInt>
            limit: number,
        }

        console.log(dbBreedIds)
        let pets: any = await prisma.$queryRaw`
        SELECT
        json_build_object(
            'id', public.pets.id,
            'created_at', public.pets.created_at,
            'name', public.pets.name,
            'description', public.pets.description,
            'weight', public.pets.weight,
            'height', public.pets.height,
            'gender', public.pets.gender,
            'breed_id', public.pets.breed_id,
            'is_vaccinated', public.pets.is_vaccinated,
            'status', public.pets.is_vaccinated,
            'contact_number', public.pets.contact_number,
            'email', public.pets.email,
            'instagram', public.pets.instagram,
            'facebook', public.pets.facebook,
            'twitter', public.pets.twitter,
            'current_longitude', ${longitude},
            'current_latitude', ${latitude},
            'longitude', public.pets.longitude,
            'latitude', public.pets.latitude,
            'lost_date', public.pets.lost_date,
            'distance',  ( 3959 * acos( cos( radians(public.pets.latitude) ) * cos( radians( ${latitude} ) ) * cos( radians( ${longitude} ) - radians(public.pets.longitude) ) + sin( radians(public.pets.latitude) ) * sin( radians( ${latitude} ) ) ) ),
            'breed', json_build_object(
                'id', public.animal_breeds.id,
                'name', public.animal_breeds.name,
                'type', public.animal_types.name
            ),
            'pet_images', json_agg(
                json_build_object(
                    'url', public.pet_images.url
                )
            )
        )
        FROM public.pets
        INNER JOIN public.pet_images ON public.pet_images.pet_id = public.pets.id
        INNER JOIN public.animal_breeds ON public.animal_breeds.id = public.pets.breed_id
        INNER JOIN public.animal_types ON public.animal_types.id = public.animal_breeds.animal_type_id
        WHERE public.pets.is_deleted = false AND public.pets.status = ${status}
        AND ( 3959 * acos( cos( radians(public.pets.latitude) ) * cos( radians( ${latitude} ) ) 
        * cos( radians( ${longitude} ) - radians(public.pets.longitude) ) + sin( radians(public.pets.latitude) ) * sin( radians( ${latitude} ) ) ) ) <= ${radius}
        GROUP BY public.pets.id, public.animal_breeds.id, public.animal_types.id, public.pet_images.id
        ORDER BY public.pets.created_at asc
        OFFSET ${skip}
        LIMIT ${limit}
        `

        console.log(pets[0])


        reply.send({
            pets
        });



    }
    )
}
