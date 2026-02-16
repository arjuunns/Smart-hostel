import org.openqa.selenium.By;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.support.ui.Select;

public class leave {

	public static void main(String[] args) throws InterruptedException {
		// TODO Auto-generated method stub
		System.setProperty("webdriver.chrome.driver", "C:\\Users\\Srikrishna Vadlamani\\Downloads\\chromedriver-win64\\chromedriver.exe");
		
		ChromeDriver driver = new ChromeDriver();
		
		driver.get("https://smart-hostel-9pjq.vercel.app/");
		Thread.sleep(2000);
	
		driver.manage().window().maximize();
		
		driver.get("https://smart-hostel-9pjq.vercel.app/");
		Thread.sleep(2000);
		
		driver.manage().window().maximize();
		
		WebElement loginEmail = driver.findElement(By.id("loginEmail"));
		loginEmail.sendKeys("abcdefg123@gmail.com");
		Thread.sleep(1000);
		
		WebElement loginPwd = driver.findElement(By.id("loginPassword"));
		loginPwd.sendKeys("F9!qZ7@L2xR#M8pA");
		Thread.sleep(1000);
		
		WebElement login = driver.findElement(By.id("login"));
		login.click();
		Thread.sleep(5000);
		
		WebElement leaveButton = driver.findElement(By.xpath("/html/body/div[1]/aside/nav/a[2]"));
		leaveButton.click();
		Thread.sleep(1000);
		
		Select sel = new Select(driver.findElement(By.id("leaveType")));
		sel.selectByValue("EMERGENCY");
		Thread.sleep(1000);
		
		WebElement fromDate = driver.findElement(By.id("fromDateTime"));
		fromDate.sendKeys("2026-02-20T10:30");
		Thread.sleep(1000);

		WebElement toDate = driver.findElement(By.id("toDateTime"));
		toDate.sendKeys("2026-02-21T18:00");
		Thread.sleep(1000);
		
		WebElement reasonBox = driver.findElement(By.id("reason"));
		reasonBox.sendKeys("Going home for personal work");
		Thread.sleep(1000);
		
		WebElement submitLeaveButton = driver.findElement(By.xpath("//*[@id=\"leaveForm\"]/button"));
		submitLeaveButton.click();
		Thread.sleep(5000);
	}

}
