import org.openqa.selenium.By;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;

public class login {

	public static void main(String[] args) throws InterruptedException {
		// TODO Auto-generated method stub
System.setProperty("webdriver.chrome.driver", "C:\\Users\\Srikrishna Vadlamani\\Downloads\\chromedriver-win64\\chromedriver.exe");
		
		ChromeDriver driver = new ChromeDriver();
		
	driver.get("https://smart-hostel-9pjq.vercel.app/");
	Thread.sleep(2000);
	
	driver.manage().window().maximize();
	
	WebElement loginEmail = driver.findElement(By.id("loginEmail"));
	loginEmail.sendKeys("abcdefg123@gmail.com");
	Thread.sleep(1000);
	
	WebElement passwordField = driver.findElement(By.id("loginPassword"));
    passwordField.sendKeys("F9!qZ7@L2xR#M8pA"); 

    if (!validatePassword(passwordField)) {
        System.out.println("Password validation failed. Stopping execution.");
        Thread.sleep(2000);
        driver.quit();
        return;
    }
	
	WebElement login = driver.findElement(By.id("login"));
	login.click();
	Thread.sleep(3000);
	}
	
	private static boolean validatePassword(WebElement pwdElement) {

        String pwd = pwdElement.getAttribute("value");

        if (pwd.length() < 8 || pwd.length() > 17) {
            System.out.println("Error: Password must be 8-17 characters");
            return false;
        }

        if (!pwd.matches(".*[0-9].*")) {
            System.out.println("Error: Must contain a digit");
            return false;
        }

        if (!pwd.matches(".*[A-Z].*")) {
            System.out.println("Error: Must contain uppercase letter");
            return false;
        }

        if (!pwd.matches(".*[a-z].*")) {
            System.out.println("Error: Must contain lowercase letter");
            return false;
        }

        if (!pwd.matches(".*[!@#$%&*()\\-+=^].*")) {
            System.out.println("Error: Must contain special character");
            return false;
        }

        if (pwd.contains(" ")) {
            System.out.println("Error: Must not contain whitespace");
            return false;
        }

        System.out.println("Password valid");
        return true;
	}

}
