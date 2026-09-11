import {getCurrentProfile} from '@/lib/auth/get-current-profile'
import {CourseOverview} from '@/components/course/course-overview'
export default async function Page(){const profile=await getCurrentProfile();return <CourseOverview teacher={profile.role!=='writer'} />}
