package com.rvo.rvoserver;

import com.rvo.rvoserver.pojo.Pos;
//import com.rvo.rvoserver.utils.PoissonUtils;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;

import java.io.*;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class RvoServerApplicationTests {

	@Test
	void pointTest() {
		List<Pos> points = new ArrayList<>();
		Pos p1 = new Pos(0, 0);
		Pos p2 = new Pos(1, 0);
		Pos p3 = new Pos(1, 1);
		Pos p4 = new Pos(0, 1);
		points.add(p1);
		points.add(p2);
		points.add(p3);
		points.add(p4);
//		List<Pos> pos = PoissonUtils.generatePoints(points, 0.1, 10);
//		System.out.println(pos);

	}

	@Test
	void checkNum() {
		List<List<Map<String, Integer>>> res = new ArrayList<>();
		try {
//			ObjectOutputStream oos = new ObjectOutputStream(new FileOutputStream(recordPath + newFileName));
//			oos.writeObject(res);
			ObjectInputStream ois = new ObjectInputStream(new FileInputStream("D:\\vue\\record\\21b4fd8c-abcb-4875-95a0-d0a71c82264c.rvo"));
			res = (List<List<Map<String, Integer>>>) ois.readObject();
		} catch (IOException e) {
			e.printStackTrace();
		} catch (ClassNotFoundException e) {
			throw new RuntimeException(e);
		}
		System.out.println(res.size());
		for(List<Map<String, Integer>> i : res) {
			System.out.println(i.size());
		}
	}

	public static void main(String[] args) {
		BigDecimal a = new BigDecimal(1.2176E-007);
		System.out.println(a.multiply(new BigDecimal(10000000)) + " ");
	}

}
