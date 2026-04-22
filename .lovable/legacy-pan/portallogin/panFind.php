<?php
require_once('../database/header.php');
?>
<!-- Begin Page Content -->
   <div class="container-fluid">
 
   <!-- DataTales Example -->
          <div class="card shadow mb-4">
            <div class="card-header py-3">
              <h6 class="m-0 font-weight-bold text-primary">Pan Find</h6>
            </div>
            <div class="card-body">
<?php
if(isset($_POST['reject'])){
    $status = 'rejected';
    $idd=$_POST['id'];
    $pnd = $conn->prepare("SELECT * FROM `panfind` WHERE `id`='".$idd."'");
    $pnd->execute();
    $pn_data = $pnd->fetch();
    if($pn_data['status']=='pending'){
        $pnnmbr = 'This aadhaar is not linked any Pan.';
    $pq = $conn->query("UPDATE `panfind` SET `status`='".$status."', `pan_number`='".$pnnmbr."' WHERE `id`='".$idd."'");
    if($pq){
        $lgu = $conn->prepare("SELECT * FROM `loginusers` WHERE `username`='".$pn_data['username']."'");
        $lgu->execute();
        $luser = $lgu->fetch();
        $balnc = $luser['balance'];
        $refamt = $luser['pan_find_charge'];
        $new_bal = $balnc+$refamt;
        $qq = $conn->query("UPDATE loginusers SET balance='".$new_bal."'  WHERE username='".$pn_data['username']."'");
       // $qq->execute([$new_bal,$pn_data['username']]);
        $txnsql = "INSERT INTO `paymentreq`(`date_time`, `user`, `bank`, `mode`, `type`, `amount`,`balance`, `reference`, `remark`, `status`)
 VALUES (:date_time,:user,:bank,:mode,:type,:amount,:balance,:reference,:remark,:status)";
$mode = 'Refund of pan find';	
$type = 'credit';
$amount = $refamt;
$remark = 'Refund of pan find : '.$userdata['username'].' - '.$userdata['owner_name'];
$status = 'success';
$reference = 'Refund of '.$pn_data['order_id'];
$txn = $conn->prepare($txnsql);
$txn->bindParam(":date_time", $date_time);
$txn->bindParam(":user", $userdata['username']);
$txn->bindParam(":bank", $userdata['username']);
$txn->bindParam(":mode", $mode);
$txn->bindParam(":type", $type);
$txn->bindParam(":amount", $amount);
$txn->bindParam(":balance", $new_bal);
$txn->bindParam(":reference", $reference);
$txn->bindParam(":remark", $remark);
$txn->bindParam(":status", $status);
if($txn->execute()){
         echo '<div class="alert alert-success" role="alert">
<strong>Pan Find!</strong> Refunded!</div>';    
redirect(1500,"panFind"); 
}else{
    echo '<div class="alert alert-danger" role="alert">
<strong>Error!</strong> Service is Down!</div>'; 
    }
    }
    }
}


if(isset($_POST['pan_no'])){
    $pan_no = $_POST['pan_no'];
    $status = 'success';
    $idd=$_POST['id'];
    $pq = $conn->query("UPDATE panfind SET pan_number='".$pan_no."', status='".$status."' WHERE id='".$idd."'");
    if($pq){
         echo '<div class="alert alert-success" role="alert">
<strong>Pan!</strong> Updated!</div>';    
redirect(1500,"panFind"); 
}else{
    echo '<div class="alert alert-danger" role="alert">
<strong>Error!</strong> Service is Down!</div>'; 
    }
}

if(isset($_GET['active']) && $_GET['active']==true){
    if($userdata['balance']>=$userdata['bc_id']){
    $amount = $userdata['bc_id']; 
    $new_bal = $userdata['balance'] - $amount;
$sqlu = $conn->prepare("UPDATE loginusers SET balance=?, bc_data=?  WHERE id=?");
$sqlu->execute([$new_bal,"YES",$userdata['id']]);
$txnsql = "INSERT INTO `paymentreq`(`date_time`, `user`, `bank`, `mode`, `type`, `amount`,`balance`, `reference`, `remark`, `status`)
 VALUES (:date_time,:user,:bank,:mode,:type,:amount,:balance,:reference,:remark,:status)";
$mode = 'Pan Find Activation';	
$type = 'debit';
$remark = 'Pan Find Activation Service Charge: '.$userdata['username'].' - '.$userdata['owner_name'];
$status = 'success';
$reference = 'Pan Find Activation'.$order_id;
$txn = $conn->prepare($txnsql);
$txn->bindParam(":date_time", $date_time);
$txn->bindParam(":user", $userdata['username']);
$txn->bindParam(":bank", $userdata['username']);
$txn->bindParam(":mode", $mode);
$txn->bindParam(":type", $type);
$txn->bindParam(":amount", $amount);
$txn->bindParam(":balance", $new_bal);
$txn->bindParam(":reference", $reference);
$txn->bindParam(":remark", $remark);
$txn->bindParam(":status", $status);
if($txn->execute()){
    
    echo '<div class="alert alert-success" role="alert">
<strong>Congratulations!</strong> Service Successfully Activated!</div>';    
redirect(1500,"panFind"); 
}else{
    echo '<div class="alert alert-danger" role="alert">
<strong>Error!</strong> Service is Down!</div>';      
}
}else{
    echo '<div class="alert alert-danger" role="alert">
    <strong>Error!</strong> You have insufficient balance!</div>';
}
    
}


if(isset($_POST['submit']) AND 
!empty($_POST['name']) AND 
!empty($_POST['dob'])AND 
!empty($_POST['uid'])
){
$name=get_safe($_POST['name']);
$uid=get_safe($_POST['uid']);
$dob=$_POST['dob'];
$orderid = 'PNFN'.rand();
$username = $userdata['username'];

$unm=$conn->prepare("SELECT * FROM `loginusers` WHERE `username` = '".$username."'");
$unm->execute();
$bal = $unm->fetch();
$balance = $bal['balance'];

if($userdata['balance']>=$userdata['pan_find_charge']){

$amount = $bal['pan_find_charge'];
$newbal = $balance-$amount;
$refarance = 'Pan find for '.$name.'-'.$uid;
$stats = 'pending';

$tsql = $conn->prepare("INSERT INTO `panfind`(`name`, `dob`, `uid`, `order_id`, `username`, `status`) VALUES ('".$name."','".$dob."','".$uid."','".$orderid."','".$username."', '".$stats."')");
if($tsql->execute()){
    
    $qrr = $conn->query("UPDATE `loginusers` SET `balance` = '".$newbal."' WHERE `username` = '".$username."'");
    $qrr->execute();
	
$txnsql = "INSERT INTO `paymentreq`(`web_url`,`date_time`, `user`, `bank`, `mode`, `type`, `amount`,`balance`, `reference`, `remark`, `status`)
 VALUES (:web_url,:date_time,:user,:bank,:mode,:type,:amount,:balance,:reference,:remark,:status)";	
$type = 'debit';
//$balancec = '0';
$status = 'success';
$mode = 'Wallet';

if($userdata['usertype']=="wluser"){
$weburl_a = $mw_data['weburl'];    
}else{
$weburl_a = $_SERVER['SERVER_NAME'];     
}
$txn = $conn->prepare($txnsql);
$txn->bindParam(":web_url", $weburl_a );
$txn->bindParam(":date_time", $date_time);
$txn->bindParam(":user", $userdata['username']);
$txn->bindParam(":bank", $userdata['username']);
$txn->bindParam(":mode", $mode);
$txn->bindParam(":type", $type);
$txn->bindParam(":amount", $amount);
$txn->bindParam(":balance", $newbal);
$txn->bindParam(":reference", $refarance);
$txn->bindParam(":remark", $orderid);
$txn->bindParam(":status", $status);
if($txn->execute()){
    $ardata = json_encode(array("aadhaar"=>"aadhaar",
    "token"=>"70eb93-342c2d-1309fd-d39d67-daf749", 
   "aadhaar_no" => $uid,
   "application_no"=>$orderid
   ));
   $urll = "https://nsdl.busyworld.in.net/portallogin/panFindapi.php";
    
    $curl = curl_init();

curl_setopt_array($curl, array(
  CURLOPT_URL => $urll,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_ENCODING => '',
  CURLOPT_MAXREDIRS => 10,
  CURLOPT_TIMEOUT => 0,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
  CURLOPT_CUSTOMREQUEST => 'POST',
  CURLOPT_POSTFIELDS =>$ardata,
  CURLOPT_HTTPHEADER => array(
    'Content-Type: application/json'
  ),
));

$response = curl_exec($curl);

curl_close($curl);
$apdata = json_decode($response, true);
    //if($apdata['status']==false){
        if($apdata['errorcode']=='200'){
        $upan = $conn->query("UPDATE panfind SET status='rejected', pan_number='".$apdata['msg']."' WHERE order_id='".$orderid."'");
        $refn = $conn->prepare("SELECT * FROM `loginusers` WHERE `username` = '".$userdata['username']."'");
        $refn->execute();
        $refnr=$refn->fetch();
        $refamtt = $refnr['pan_find_charge'];
        $nlbal=$refnr['balance']+$refamtt;
        $qq = $conn->query("UPDATE loginusers SET balance='".$nlbal."'  WHERE username='".$userdata['username']."'");
       // $qq->execute([$new_bal,$pn_data['username']]);
        $txnsql = "INSERT INTO `paymentreq`(`date_time`, `user`, `bank`, `mode`, `type`, `amount`,`balance`, `reference`, `remark`, `status`)
 VALUES (:date_time,:user,:bank,:mode,:type,:amount,:balance,:reference,:remark,:status)";
$mode = 'Refund of pan find';	
$type = 'credit';
$amount = $userdata['pan_find_charge'];
$remark = 'Refund of pan find : '.$userdata['username'].' - '.$userdata['owner_name'];
$status = 'success';
$reference = 'Refund of '.$pn_data['order_id'];
$txn = $conn->prepare($txnsql);
$txn->bindParam(":date_time", $date_time);
$txn->bindParam(":user", $userdata['username']);
$txn->bindParam(":bank", $userdata['username']);
$txn->bindParam(":mode", $mode);
$txn->bindParam(":type", $type);
$txn->bindParam(":amount", $amount);
$txn->bindParam(":balance", $nlbal);
$txn->bindParam(":reference", $reference);
$txn->bindParam(":remark", $remark);
$txn->bindParam(":status", $status);
$txn->execute();

echo '
<script type="text/javascript">

  Swal.fire({
                      title: "FAILED!",
                      text: "'.$apdata['msg'].'",
                      icon: "error",
                      timer: 1500
                    });
</script>
';
redirect(1500,"panFind");

        }elseif($apdata['errorcode']=='100'){
         $upan = $conn->query("UPDATE panfind SET status='success', pan_number='".$apdata['pan']."' WHERE order_id='".$orderid."'");   
         
         echo '
            <script type="text/javascript">
            
              Swal.fire({
                                  title: "SUCCESS!",
                                  text: "'.$apdata['pan'].'",
                                  icon: "success",
                                  timer: 1500
                                });
            </script>
            ';
        redirect(1500,"panFind");

        }else{
            echo '
            <script type="text/javascript">
            
              Swal.fire({
                      title: "FAILED!",
                      text: "'.$apdata['msg'].'",
                      icon: "error",
                      timer: 1500
                                });
            </script>
            ';
        redirect(1500,"panFind");
        }

}
/*} else {
echo '<div class="alert alert-danger" role="alert">
<strong>Invalid!</strong> Data Not Insert!</div>';
} */   
    
    
} else {
echo '<div class="alert alert-danger" role="alert">
<strong>Invalid!</strong> Duplicate Ref No.!</div>';
} 

}else{
   echo '<div class="alert alert-danger" role="alert">
<strong>Invalid!</strong> Insufficient Balance</div>'; 
}
	
	
}
if($userdata['bc_data']=='YES'){

?> 



			 <form class="user" action="" method="POST">

                
                  
				  <div class="form-group row">
                  <div class="col-sm-6 mb-3 mb-sm-0">
                   <btn-primary6 class="m-0 font-weight-bold text-primary">Name as per Aadhaar</h6> 
                    <input required="required" type="text" class="form-control"  placeholder="Name" name="name" onkeyup="this.value = this.value.toUpperCase();" onblur="this.value = this.value.toUpperCase();">
                  </div>
                  <div class="col-sm-6 mb-3 mb-sm-0">
                   <btn-primary6 class="m-0 font-weight-bold text-primary">Aadhaar Number</h6> 
                    <input required="required" type="text" class="form-control" maxlength="12"  placeholder="Aadhaar Number" name="uid" value="" pattern="[0-9]+">
                  </div>
				  </div> 
				  <div class="form-group row">
                  <div class="col-sm-6 mb-3 mb-sm-0">
                      <btn-primary6 class="m-0 font-weight-bold text-primary">Date of Birth</h6> 
                    <input required="required" type="date" class="form-control"  placeholder="dob" name="dob" value="">
                  </div>
                  <div class="col-sm-6 mb-3 mb-sm-0">
                      <btn-primary6 class="m-0 font-weight-bold text-danger">Rs. <?=$userdata['pan_find_charge'];?> will be debit from your wallet.</h6> 
                    <input required="required" type="submit" name="submit" class="btn btn-primary btn-block" value="Submit">
                  </div>
				  </div> 
				  
				  
				 </form>
			   
			
			
			<div class="table-responsive mt-5">
                <table class="table table-bordered" id="dataTable" width="100%" cellspacing="0">
                  <thead>
                    <tr>
                      <th style='display:none;'>SL No.</th>
                      <th class='text-primary'>NAME</th>
                      <th class='text-primary'>DOB</th>
                      <th class='text-primary'>AADHAAR</th>
                      <th class='text-primary'>VLE</th>
                      <th class='text-primary'>ORDER ID</th>
                      <th class='text-primary'>PAN NUMBER</th>
                      <th class='text-primary'>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
  				  
<?php
/*if($userdata['usertype']=="wluser"){

$stmt = $conn->prepare("select * from banklist ORDER BY `id` DESC");
$stmt->execute();
$sl=1;
while($row=$stmt->fetch()) {
  if($row['user']==$userdata['createby']){

          echo "<tr>
                      <td style='display:none;'>".$sl."</td>
            <td class='text-primary'>".strtoupper($row['ac_name'])."</td>
                      <td class='text-primary'>".strtoupper($row['ac_no'])."</td>
                      <td class='text-primary'>".strtoupper($row['bank_ifsc'])."</td>
                      <td class='text-primary'>".strtoupper($row['bank_name'])."</td>
                      <td class='text-primary'>".strtoupper($row['bank_name'])."</td>
                      <td class='text-danger'>".strtoupper($row['remark'])."</td>
                    </tr>";
$sl++;
} 
} 

}else{*/
if($userdata['usertype']=='mainadmin'){
 $stmt = $conn->prepare("SELECT * FROM `panfind` ORDER BY `id` DESC");
$stmt->execute();   
}else{
$stmt = $conn->prepare("SELECT * FROM `panfind` WHERE `username` = ? ORDER BY `id` DESC");
$stmt->execute([$userdata['username']]);
}
$sl=1;
while($row=$stmt->fetch()) {?>


          <tr>
                      <td style='display:none;'><?=$sl ?></td>
            <td class='text-primary'><?=strtoupper($row['name'])?></td>
                      <td class='text-primary'><?=strtoupper($row['dob'])?></td>
                      <td class='text-primary'><?=strtoupper($row['uid'])?></td>
                      <td class='text-primary'><?=strtoupper($row['username'])?></td>
                      <td class='text-primary'><?=strtoupper($row['order_id'])?></td>
                      <td class='text-primary'><?php if($userdata['usertype']=='mainadmin' &$row['pan_number']=='' ){?>
                      <form class="user" action="" method="POST">
                          <input type="hidden" value="<?php echo $row['id'];?>" name="id"/>
                          <input type="text" placeholder="Pan Number" name="pan_no"/>
                          </br><input type="submit" name="find"/>
                      </form></br>
                      <form class="user" action="" method="POST">
                          <input type="hidden" value="<?php echo $row['id'];?>" name="id"/>
                          <input type="submit" value="Reject" name="reject"/>
                      </form>
                          <?php }else{echo strtoupper($row['pan_number']);} ?></td>
                      <td class='text-danger'><?=strtoupper($row['status'])?></td>
         </tr>
    <?php
$sl++;

}           

//}


?>				
                  </tbody>
                </table>
              </div>
	<?php }else{ ?> 
                
                  
				  <div class="form-group row">
                  <div class="col-sm-6 mb-3 mb-sm-0">
                   <h3 class="text-danger"><b>Find Pan by Aadhaar Number.</b></h3>
                    <button class="btn btn-success mb-2" onclick="activeService()">Active This Service</button><br>
                    <span class="text-danger"><b>Note: Service Activation Charges Rs.<?php echo $userdata['bc_id'];?> Only, Amount Will Be Debit From Your Wallet.Amount Not Refundable.</b></span>
                  </div>
                  </div>
        <script>
        function activeService(){
            if(confirm("Are Your Sure?")){
                location.href = "?active=true";
            }
        }    
</script>
	<?php } ?>
            
            </div>
          </div>  
        </div>
        <!-- /.container-fluid -->
      <!-- End of Main Content -->
<?php
require_once('../database/footer.php');
?>