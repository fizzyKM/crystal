export default function LoginForm() {
    return (
        <form method="get" action="login">
            <input type="text" name="handle" placeholder="Your Bluesky handle" />
            <input type="submit" value="Log in" />
        </form>
    );
}